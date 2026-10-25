import type { LearningNotesDB } from '../core/db'
import type { Block, Card } from '../core/types'
import { currentLocale } from '../i18n/t'
import { cardStatus, type CardStatus } from './cardList'
import {
  CARD_BLOCK_TYPE,
  cardParts,
  hasQuestion,
  maskedText,
} from './cardService'

/**
 * Querying all cards (the "All cards" hub). One entry point, `queryCards`,
 * so tags, status/notebook filters, other sort orders and a table view can
 * be added as new `CardQuery` fields without changing its callers.
 */

/** What to show. Unset fields don't filter. */
export interface CardQuery {
  /** Words to find in the question (case- and accent-insensitive). */
  search?: string
  // Later: tags, statuses, notebookIds, sort, …
}

export interface CardHit {
  cardId: string
  blockId: string
  pageId: string
  pageTitle: string
  notebookTitle: string
  /** The question; a blank card shows its blank as "…". */
  question: string
  status: CardStatus
  due: number
}

/**
 * Where a page stopped: the last card's `due` and how many cards with that
 * same `due` were already read. Resuming from here reads only from that
 * point on (an offset would re-walk every earlier card each time).
 */
export interface CardCursor {
  due: number
  skip: number
}

export interface CardPage {
  hits: CardHit[]
  /** Pass as `after` to get the next page; null when there are no more. */
  next: CardCursor | null
}

/** Cards read from the database per round (keeps memory flat). */
const CHUNK = 500

/** Lower-case, accents removed, so "Café" matches "cafe". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase(currentLocale())

/**
 * One page of cards, soonest due first (the `due` index). Skips cards whose
 * block is gone or no longer makes them, empty Cards and template cards.
 * Search reads each card's text, so it scans; page and notebook names are
 * read only for matches. A search index can replace this later without
 * changing callers.
 */
export async function queryCards(
  db: LearningNotesDB,
  query: CardQuery = {},
  {
    after = null,
    limit = 100,
  }: { after?: CardCursor | null; limit?: number } = {},
  now: number = Date.now(),
): Promise<CardPage> {
  const words = fold(query.search ?? '')
    .split(/\s+/)
    .filter(Boolean)
  const templates = new Set(
    await db.notebooks.filter((n) => n.kind === 'templates').primaryKeys(),
  )
  const hits: CardHit[] = []
  let cursor: CardCursor = after ?? { due: -Infinity, skip: 0 }
  while (hits.length < limit) {
    // Reads the already-seen ties too and drops them here: Dexie's
    // `offset` would switch to a much slower card-by-card read.
    const chunk = (
      await db.cards
        .where('due')
        .aboveOrEqual(cursor.due)
        .limit(cursor.skip + CHUNK)
        .toArray()
    ).slice(cursor.skip)
    if (chunk.length === 0) return { hits, next: null }

    const found = await matching(db, chunk, templates, words)
    const named = await describe(db, found.slice(0, limit - hits.length), now)
    hits.push(...named)
    if (hits.length === limit) {
      // Resume right after the last card shown.
      const last = found[named.length - 1].card
      return { hits, next: move(cursor, chunk, chunk.indexOf(last)) }
    }
    cursor = move(cursor, chunk, chunk.length - 1)
  }
  return { hits, next: cursor }
}

/** The cursor just after `chunk[last]`, for a chunk read from `cursor`. */
function move(cursor: CardCursor, chunk: Card[], last: number): CardCursor {
  const due = chunk[last].due
  let skip = due === cursor.due ? cursor.skip : 0
  for (let i = 0; i <= last; i++) if (chunk[i].due === due) skip++
  return { due, skip }
}

interface Found {
  card: Card
  block: Block
  question: string
}

/** The cards that are shown and match every search word (same order). */
async function matching(
  db: LearningNotesDB,
  cards: Card[],
  templates: ReadonlySet<string>,
  words: string[],
): Promise<Found[]> {
  const blocks = await db.blocks.bulkGet(unique(cards.map((c) => c.blockId)))
  const blockOf = byId<Block>(blocks)
  const found: Found[] = []
  for (const card of cards) {
    const block = blockOf.get(card.blockId)
    if (
      card.deletedAt !== null ||
      !block ||
      block.deletedAt !== null ||
      templates.has(card.notebookId) ||
      !cardParts(block).includes(card.part) ||
      !hasQuestion(block)
    ) {
      continue
    }
    const question = maskedText(
      block.content.text,
      block.type === CARD_BLOCK_TYPE ? undefined : card.part,
    )
    if (words.length > 0) {
      const text = fold(question)
      if (!words.every((w) => text.includes(w))) continue
    }
    found.push({ card, block, question })
  }
  return found
}

/** Adds page and notebook names (only for cards that are shown). */
async function describe(
  db: LearningNotesDB,
  found: Found[],
  now: number,
): Promise<CardHit[]> {
  const [pages, notebooks] = await Promise.all([
    db.pages.bulkGet(unique(found.map((f) => f.card.pageId))),
    db.notebooks.bulkGet(unique(found.map((f) => f.card.notebookId))),
  ])
  const pageOf = byId(pages)
  const notebookOf = byId(notebooks)
  return found.map(({ card, block, question }) => ({
    cardId: card.id,
    blockId: block.id,
    pageId: card.pageId,
    pageTitle: pageOf.get(card.pageId)?.title ?? '',
    notebookTitle: notebookOf.get(card.notebookId)?.title ?? '',
    question,
    status: cardStatus(card, now),
    due: card.due,
  }))
}

const unique = <T>(list: T[]) => [...new Set(list)]

const byId = <T extends { id: string }>(list: (T | undefined)[]) =>
  new Map(list.filter((x): x is T => !!x).map((x) => [x.id, x]))
