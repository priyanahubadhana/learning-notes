import { addBlocks, type BlockInput } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { restoreMany, softDeleteMany } from '../core/records'
import type { JsonObject, Page } from '../core/types'
import { fromOutline, serializeMindMap } from '../editor/mindMap/model'
import { markdownToBlocks, inlineRuns } from '../editor/textBlocks'
import { imageRef } from '../images/imageRef'
import { t } from '../i18n/t'
import { ensureSourceNotebook } from '../library/libraryService'
import { createPage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'
import { clozeParts, parseNotes, type ParsedNotes } from './notesFormat'

/**
 * Turns a parsed AI answer into ordinary blocks (CR2). Everything it makes is
 * the same kind of content a hand makes (headings, lists, Card blocks,
 * fill-in-the-blank, the mind map block, pictures), marked `source: 'ai'` and
 * given one `batchId` so "Remove this AI result" can take the whole answer
 * away in one step. Nothing is locked; the user edits it freely.
 */

const run = (text: string, styles: JsonObject = {}): JsonObject => ({
  type: 'text',
  text,
  styles,
})
const heading = (key: Parameters<typeof t>[0]): BlockInput => ({
  type: 'heading',
  content: { level: 2, text: [run(t(key))] },
})

/** `![caption](images/name.png)` alone on a line. */
const IMAGE_LINE = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/

/** The image file name in a Markdown reference (`images/x.png` → `x.png`). */
export const imageNameOf = (ref: string): string =>
  (ref.split('/').pop() ?? '').toLowerCase()

/** Markdown with picture lines → blocks (pictures need `images`: name → id). */
function bodyToBlocks(
  body: string,
  images: ReadonlyMap<string, string>,
): BlockInput[] {
  const out: BlockInput[] = []
  let chunk: string[] = []
  const flush = () => {
    if (chunk.length) out.push(...markdownToBlocks(chunk.join('\n')))
    chunk = []
  }
  for (const line of body.split('\n')) {
    const m = IMAGE_LINE.exec(line)
    const id = m ? images.get(imageNameOf(m[2])) : undefined
    if (m && id) {
      flush()
      out.push({
        type: 'image',
        content: { url: imageRef(id), caption: m[1] },
      })
    } else chunk.push(m ? m[1] : line) // a missing picture keeps its caption
  }
  flush()
  return out
}

/** Pulls `![..](..)` pictures out of an answer; returns the text and picture blocks. */
function answerBlocks(
  answer: string,
  images: ReadonlyMap<string, string>,
): BlockInput[] {
  const pics: BlockInput[] = []
  const text = answer.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, cap, ref) => {
    const id = images.get(imageNameOf(ref))
    if (id) {
      pics.push({
        type: 'image',
        content: { url: imageRef(id), caption: cap },
      })
      return ''
    }
    return cap
  })
  return [
    { type: 'paragraph', content: { text: inlineRuns(text.trim()) } },
    ...pics,
  ]
}

/** The block inputs for a parsed answer. */
export function notesToBlocks(
  n: ParsedNotes,
  images: ReadonlyMap<string, string> = new Map(),
): BlockInput[] {
  const out: BlockInput[] = []
  if (n.keyPoints.length) {
    out.push(heading('capture.sectionKeyPoints'))
    for (const k of n.keyPoints) {
      out.push({ type: 'bulletListItem', content: { text: inlineRuns(k) } })
    }
  }
  if (n.steps.length) {
    out.push(heading('capture.sectionSteps'))
    for (const s of n.steps) {
      out.push({ type: 'numberedListItem', content: { text: inlineRuns(s) } })
    }
  }
  if (n.mindMap) {
    const map = fromOutline(n.mindMap, n.title)
    out.push(heading('capture.sectionMindMap'), {
      type: 'mindMap',
      content: { data: serializeMindMap(map), theme: 'calm' },
    })
  }
  if (n.cards.length) {
    out.push(heading('capture.sectionCards'))
    for (const c of n.cards) {
      if (c.kind === 'qa') {
        out.push({
          type: 'card',
          content: { text: inlineRuns(c.q) },
          children: c.a ? answerBlocks(c.a, images) : [],
        })
      } else {
        const parts = clozeParts(c.text)
        // A cloze with no hidden word is just a sentence.
        out.push({
          type: 'paragraph',
          content: {
            text: parts.map((p) =>
              run(p.text, p.blank ? { blank: createId() } : {}),
            ),
          },
        })
      }
    }
  }
  if (n.screenshots.length) {
    out.push(heading('capture.sectionScreenshots'))
    for (const s of n.screenshots) {
      out.push({
        type: 'paragraph',
        content: {
          text: [
            run(t('capture.screenshotSlot', { time: s.time, what: s.what })),
          ],
        },
      })
    }
  }
  for (const r of n.rest) {
    if (r.heading) {
      out.push({
        type: 'heading',
        content: { level: 2, text: inlineRuns(r.heading) },
      })
    }
    out.push(...bodyToBlocks(r.body, images))
  }
  return out
}

export interface ImportResult {
  pageId: string
  batchId: string
  cards: number
  blocks: number
}

/**
 * Parses `markdown` and adds it to `pageId` (a source page), or, with no
 * page, to a new page in Sources named after the notes. Throws
 * `NotesFormatError` when the text holds nothing usable.
 */
export async function importNotes(
  db: LearningNotesDB,
  workspaceId: string,
  markdown: string,
  options: { pageId?: string; images?: ReadonlyMap<string, string> } = {},
): Promise<ImportResult> {
  // May throw before anything is written.
  return importParsed(db, workspaceId, parseNotes(markdown), options)
}

/** The same, for notes that are already parsed (the AI approval list). */
export async function importParsed(
  db: LearningNotesDB,
  workspaceId: string,
  parsed: ParsedNotes,
  options: { pageId?: string; images?: ReadonlyMap<string, string> } = {},
): Promise<ImportResult> {
  const inputs = notesToBlocks(parsed, options.images)
  let page: Page | undefined = options.pageId
    ? await db.pages.get(options.pageId)
    : undefined
  if (!page) {
    const nb = await ensureSourceNotebook(db, workspaceId, 'sources')
    page = await createPage(db, nb.id, null, parsed.title.slice(0, 200))
    await db.pages.update(page.id, {
      source: { kind: 'paste', capturedAt: Date.now() },
    })
  } else if (!page.title && parsed.title) {
    await db.pages.update(page.id, { title: parsed.title.slice(0, 200) })
  }
  const batchId = createId()
  const made = await addBlocks(db, page.id, inputs, {
    source: 'ai',
    batchId,
  })
  await syncCardRecords(db, page.id)
  const cards = parsed.cards.filter(
    (c) => c.kind === 'qa' || clozeParts(c.text).some((p) => p.blank),
  ).length
  return { pageId: page.id, batchId, cards, blocks: made.length }
}

// ---- Provenance: "Made with your AI" and one-step removal ----

/** The AI results (batches) on a page, newest first, with their size. */
export async function aiBatches(
  db: LearningNotesDB,
  pageId: string,
): Promise<{ batchId: string; blocks: number; at: number }[]> {
  const blocks = await db.blocks
    .where('pageId')
    .equals(pageId)
    .filter((b) => b.deletedAt === null && !!b.batchId)
    .toArray()
  const map = new Map<string, { batchId: string; blocks: number; at: number }>()
  for (const b of blocks) {
    const id = b.batchId as string
    const e = map.get(id) ?? { batchId: id, blocks: 0, at: b.createdAt }
    e.blocks++
    e.at = Math.max(e.at, b.createdAt)
    map.set(id, e)
  }
  return [...map.values()].sort((a, b) => b.at - a.at)
}

/** Soft-deletes a whole AI result. Returns what to hand to `restoreAiResult`. */
export async function removeAiResult(
  db: LearningNotesDB,
  pageId: string,
  batchId: string,
): Promise<string[]> {
  const ids = (
    await db.blocks
      .where('pageId')
      .equals(pageId)
      .filter((b) => b.batchId === batchId && b.deletedAt === null)
      .toArray()
  ).map((b) => b.id)
  await softDeleteMany(db.blocks, ids, Date.now())
  return ids
}

/**
 * "Keep as mine": the blocks of an AI result stop being marked as AI (no
 * `source`, no `batchId`), so they are ordinary notes. Returns the block ids
 * so the change can be put back.
 */
export async function keepAiResult(
  db: LearningNotesDB,
  pageId: string,
  batchId: string,
): Promise<string[]> {
  const ids = (
    await db.blocks
      .where('pageId')
      .equals(pageId)
      .filter((b) => b.batchId === batchId && b.deletedAt === null)
      .toArray()
  ).map((b) => b.id)
  const now = Date.now()
  await db.transaction('rw', db.blocks, async () => {
    for (const id of ids) {
      await db.blocks.update(id, {
        source: undefined,
        batchId: undefined,
        updatedAt: now,
      })
    }
  })
  return ids
}

/** The Undo of `removeAiResult`. */
export async function restoreAiResult(
  db: LearningNotesDB,
  ids: readonly string[],
): Promise<void> {
  await restoreMany(db.blocks, ids, Date.now())
}
