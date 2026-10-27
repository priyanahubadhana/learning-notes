import type { LearningNotesDB } from '../core/db'
import { newRecordFields } from '../core/records'
import { ordersBetween } from '../core/order'
import type { Block, JsonValue, Page } from '../core/types'
import { createNotebook } from '../notebooks/notebookService'
import { CARD_BLOCK_TYPE, syncCardRecords } from '../recall/cardService'
import { clozeToLines, htmlToLines, type TextRun } from './ankiHtml'
import type { AnkiCollection, AnkiNote } from './readApkg'

/** Notes per page: a deck is split so no page gets too heavy to edit. */
export const NOTES_PER_PAGE = 300

export interface AnkiImportSummary {
  notebookId: string
  notebookTitle: string
  pages: number
  cards: number
  /** Notes with nothing on the front, left out. */
  skipped: number
  /** Pictures and sounds that were in the package (not imported). */
  media: number
}

type Draft = { type: string; runs: TextRun[]; children: TextRun[][] }

/** A note as blocks: a Card (front = question, back lines = answer) or a cloze line. */
function draftsOf(note: AnkiNote): Draft[] {
  if (note.kind === 'cloze') {
    const lines = clozeToLines(note.fields[0] ?? '')
    const extra = htmlToLines(note.fields.slice(1).join('<br>'))
    return [...lines, ...extra].map((runs) => ({
      type: 'paragraph',
      runs,
      children: [],
    }))
  }
  const front = htmlToLines(note.fields[0] ?? '')
  const back = htmlToLines(note.fields.slice(1).join('<br>'))
  if (front.length === 0) return []
  // One line of question: several lines are joined with a space.
  const runs = front.flatMap((line, i) =>
    i === 0
      ? line
      : [{ type: 'text' as const, text: ' ', styles: {} }, ...line],
  )
  return [{ type: CARD_BLOCK_TYPE, runs, children: back }]
}

const toContent = (runs: TextRun[]) => ({ text: runs as unknown as JsonValue })

/**
 * Adds an Anki package's notes as a new notebook: one page per deck (a
 * big deck is split into pages of `NOTES_PER_PAGE`), notes as Card blocks
 * ("Basic") or blanks ("Cloze"). Cards start New; Anki's schedules are
 * not carried over.
 */
export async function importAnki(
  db: LearningNotesDB,
  workspaceId: string,
  collection: AnkiCollection,
  title: string,
  onProgress?: (done: number, total: number) => void,
): Promise<AnkiImportSummary> {
  const notebook = await createNotebook(db, workspaceId, title || 'Anki import')
  const byDeck = new Map<string, AnkiNote[]>()
  for (const note of collection.notes) {
    const list = byDeck.get(note.deck) ?? []
    list.push(note)
    byDeck.set(note.deck, list)
  }
  const summary: AnkiImportSummary = {
    notebookId: notebook.id,
    notebookTitle: notebook.title,
    pages: 0,
    cards: 0,
    skipped: 0,
    media: collection.mediaCount,
  }
  const total = collection.notes.length
  let done = 0
  const decks = [...byDeck.entries()]
  const pageCount = decks.reduce(
    (n, [, notes]) => n + Math.ceil(notes.length / NOTES_PER_PAGE),
    0,
  )
  const pageOrder = ordersBetween(null, null, Math.max(pageCount, 1))
  let pageIndex = 0

  for (const [deck, notes] of decks) {
    for (let start = 0; start < notes.length; start += NOTES_PER_PAGE) {
      const chunk = notes.slice(start, start + NOTES_PER_PAGE)
      const part = start / NOTES_PER_PAGE + 1
      const parts = Math.ceil(notes.length / NOTES_PER_PAGE)
      const perNote = chunk.map(draftsOf)
      const drafts = perNote.flat()
      summary.skipped += perNote.filter((d) => d.length === 0).length
      done += chunk.length
      onProgress?.(done, total)
      if (drafts.length === 0) continue
      const page: Page = {
        ...newRecordFields(),
        notebookId: notebook.id,
        parentId: null,
        title: parts > 1 ? `${deck} (${part})` : deck,
        order: pageOrder[pageIndex++],
      }
      const topOrders = ordersBetween(null, null, drafts.length)
      const blocks: Block[] = []
      drafts.forEach((draft, i) => {
        const block: Block = {
          ...newRecordFields(),
          pageId: page.id,
          parentId: null,
          type: draft.type,
          content: toContent(draft.runs),
          order: topOrders[i],
          source: 'anki',
        }
        blocks.push(block)
        const childOrders = ordersBetween(null, null, draft.children.length)
        draft.children.forEach((runs, j) =>
          blocks.push({
            ...newRecordFields(),
            pageId: page.id,
            parentId: block.id,
            type: 'paragraph',
            content: toContent(runs),
            order: childOrders[j],
            source: 'anki',
          }),
        )
      })
      await db.transaction('rw', db.pages, db.blocks, db.cards, async () => {
        await db.pages.add(page)
        await db.blocks.bulkAdd(blocks)
        await syncCardRecords(db, page.id)
      })
      summary.pages++
      summary.cards += await db.cards.where('pageId').equals(page.id).count()
    }
  }
  return summary
}
