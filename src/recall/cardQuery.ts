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

export interface CardPage {
  hits: CardHit[]
  /** Pass as `after` to get the next page; null when there are no more. */
  next: number | null
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
 * Search reads each card's text, so it scans; a search index can replace
 * this later without changing callers.
 */
export async function queryCards(
  db: LearningNotesDB,
  query: CardQuery = {},
  { after = 0, limit = 100 }: { after?: number; limit?: number } = {},
  now: number = Date.now(),
): Promise<CardPage> {
  const words = fold(query.search ?? '')
    .split(/\s+/)
    .filter(Boolean)
  const templates = new Set(
    await db.notebooks.filter((n) => n.kind === 'templates').primaryKeys(),
  )
  const hits: CardHit[] = []
  let offset = after
  while (hits.length < limit) {
    const chunk = await db.cards
      .orderBy('due')
      .offset(offset)
      .limit(CHUNK)
      .toArray()
    if (chunk.length === 0) return { hits, next: null }

    const found = await describe(db, chunk, templates, now)
    for (let i = 0; i < chunk.length; i++) {
      const hit = found[i]
      if (hit && words.every((w) => fold(hit.question).includes(w))) {
        hits.push(hit)
        if (hits.length === limit) {
          // Resume right after this card next time.
          return { hits, next: offset + i + 1 }
        }
      }
    }
    offset += chunk.length
  }
  return { hits, next: offset }
}

/** Hit for each card (same order), or null for cards that are left out. */
async function describe(
  db: LearningNotesDB,
  cards: Card[],
  templates: ReadonlySet<string>,
  now: number,
): Promise<(CardHit | null)[]> {
  const unique = <T>(list: T[]) => [...new Set(list)]
  const [blocks, pages, notebooks] = await Promise.all([
    db.blocks.bulkGet(unique(cards.map((c) => c.blockId))),
    db.pages.bulkGet(unique(cards.map((c) => c.pageId))),
    db.notebooks.bulkGet(unique(cards.map((c) => c.notebookId))),
  ])
  const byId = <T extends { id: string }>(list: (T | undefined)[]) =>
    new Map(list.filter((x): x is T => !!x).map((x) => [x.id, x]))
  const blockOf = byId<Block>(blocks)
  const pageOf = byId(pages)
  const notebookOf = byId(notebooks)

  return cards.map((card) => {
    const block = blockOf.get(card.blockId)
    if (
      card.deletedAt !== null ||
      !block ||
      block.deletedAt !== null ||
      templates.has(card.notebookId) ||
      !cardParts(block).includes(card.part) ||
      !hasQuestion(block)
    ) {
      return null
    }
    return {
      cardId: card.id,
      blockId: block.id,
      pageId: card.pageId,
      pageTitle: pageOf.get(card.pageId)?.title ?? '',
      notebookTitle: notebookOf.get(card.notebookId)?.title ?? '',
      question: maskedText(
        block.content.text,
        block.type === CARD_BLOCK_TYPE ? undefined : card.part,
      ),
      status: cardStatus(card, now),
      due: card.due,
    }
  })
}
