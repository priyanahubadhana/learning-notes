import { addBlocks, type BlockInput } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { softDeleteMany } from '../core/records'
import type { Annotation, JsonObject } from '../core/types'
import { inlineRuns } from '../editor/textBlocks'
import { syncCardRecords } from './cardService'

/**
 * One-tap cards from highlights (CR3). Pure choices first (which word to hide,
 * what the question is), then a small service that adds the blocks to the
 * page the highlight belongs to and links every card back to its highlight
 * (`Card.sourceAnnotationId`, `Annotation.cardIds`).
 */

const STOP = new Set(
  (
    'about above after again against being below between both cannot could did does doing down during each ' +
    'every from further have having here into just more most much must never only other over same should ' +
    'since some such than that their them then there these they this those through under until very were ' +
    'what when where which while will with would your yours also because been before'
  ).split(' '),
)

const MAX_QUOTE = 300

/** The words worth hiding, longest first (words of 5+ letters, no stop words). */
export function keyTerms(sentence: string): string[] {
  const seen = new Set<string>()
  const words = (sentence.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).filter(
    (w) => {
      const k = w.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return w.length >= 5 && !STOP.has(k)
    },
  )
  const total = (sentence.match(/\S+/g) ?? []).length
  const n = total > 14 ? 2 : 1
  return words.sort((a, b) => b.length - a.length).slice(0, n)
}

/** A quote cut to about one or two sentences, so a card stays short. */
export function cardText(quote: string): string {
  const text = quote.replace(/\s+/g, ' ').trim()
  if (text.length <= MAX_QUOTE) return text
  const cut = text.slice(0, MAX_QUOTE)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '))
  return end > 80 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`
}

const run = (text: string, styles: JsonObject = {}): JsonObject => ({
  type: 'text',
  text,
  styles,
})

/** The sentence with its key terms as blanks, or null if no word can be hidden. */
export function clozeRuns(text: string): JsonObject[] | null {
  const terms = keyTerms(text)
  if (terms.length === 0) return null
  const runs: JsonObject[] = []
  const ids = new Map(terms.map((term) => [term.toLowerCase(), createId()]))
  const pattern = new RegExp(
    `(${terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'giu',
  )
  let hidden = new Set<string>()
  let last = 0
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0
    const key = m[0].toLowerCase()
    // Hide only the first appearance of each term.
    if (hidden.has(key)) continue
    hidden = new Set([...hidden, key])
    if (at > last) runs.push(run(text.slice(last, at)))
    runs.push(run(m[0], { blank: ids.get(key) as string }))
    last = at + m[0].length
  }
  if (last < text.length) runs.push(run(text.slice(last)))
  return runs
}

/**
 * The block for one highlight: a Q/A Card when it has a note (note = question,
 * quote = answer), else a fill-in-the-blank sentence. Null for an empty quote.
 */
export function cardInputFor(
  a: Pick<Annotation, 'quote' | 'note'>,
): BlockInput | null {
  const quote = a.quote?.exact ? cardText(a.quote.exact) : ''
  if (!quote) return null
  const note = a.note?.trim()
  if (note) {
    return {
      type: 'card',
      content: { text: inlineRuns(note) },
      children: [{ type: 'paragraph', content: { text: [run(quote)] } }],
    }
  }
  const cloze = clozeRuns(quote)
  if (cloze) return { type: 'paragraph', content: { text: cloze } }
  // Too short to hide a word: ask for the whole passage.
  return {
    type: 'card',
    content: { text: [run(`${quote.split(' ').slice(0, 4).join(' ')} …`)] },
    children: [{ type: 'paragraph', content: { text: [run(quote)] } }],
  }
}

export interface MadeCards {
  blockIds: string[]
  cardIds: string[]
  annotationIds: string[]
}

/**
 * Makes cards from highlights (all on one page: the book's). Highlights that
 * already have a card are skipped. Returns what `undoMakeCards` needs.
 */
export async function makeCardsFromAnnotations(
  db: LearningNotesDB,
  pageId: string,
  annotations: readonly Annotation[],
): Promise<MadeCards> {
  const todo = annotations
    .filter((a) => !a.cardIds?.length)
    .map((a) => ({ a, input: cardInputFor(a) }))
    .filter((x): x is { a: Annotation; input: BlockInput } => x.input !== null)
  if (todo.length === 0) return { blockIds: [], cardIds: [], annotationIds: [] }
  const made = await addBlocks(
    db,
    pageId,
    todo.map((x) => x.input),
  )
  await syncCardRecords(db, pageId)
  const tops = made.filter((b) => b.parentId === null)
  const cardIds: string[] = []
  const now = Date.now()
  for (const [i, { a }] of todo.entries()) {
    const block = tops[i]
    const cards = await db.cards.where('blockId').equals(block.id).toArray()
    for (const c of cards) {
      await db.cards.update(c.id, { sourceAnnotationId: a.id, updatedAt: now })
    }
    const ids = cards.map((c) => c.id)
    cardIds.push(...ids)
    await db.annotations.update(a.id, { cardIds: ids, updatedAt: now })
  }
  return {
    blockIds: made.map((b) => b.id),
    cardIds,
    annotationIds: todo.map((x) => x.a.id),
  }
}

/** The Undo: the blocks go to Trash again and the highlights are free to be carded. */
export async function undoMakeCards(
  db: LearningNotesDB,
  made: MadeCards,
): Promise<void> {
  const now = Date.now()
  await softDeleteMany(db.blocks, made.blockIds, now)
  for (const id of made.annotationIds) {
    await db.annotations.update(id, { cardIds: undefined, updatedAt: now })
  }
}
