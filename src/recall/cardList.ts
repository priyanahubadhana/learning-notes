import { dateLocale } from '../i18n/t'
import { inReadingOrder, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Card, Page } from '../core/types'
import { getPage, listPages } from '../pages/pageService'
import {
  CARD_BLOCK_TYPE,
  cardParts,
  hasQuestion,
  maskedText,
} from './cardService'
import { isNewCard } from './reviewService'

/**
 * Data for the live "Card list" block: the cards on a page (optionally its
 * sub-pages too), in reading order, with a short status for each.
 */

export type CardStatus = 'new' | 'due' | 'later' | 'suspended'

export interface CardRow {
  cardId: string
  blockId: string
  pageId: string
  /** Title of the sub-page the card is on; null when on the list's page. */
  pageTitle: string | null
  /** The question text; for a blank card, its blank shows as "…". */
  question: string
  status: CardStatus
  due: number
}

export function cardStatus(card: Card, now: number): CardStatus {
  if (card.suspendedAt !== null) return 'suspended'
  if (isNewCard(card)) return 'new'
  return card.due <= now ? 'due' : 'later'
}

/** A page and (optionally) its sub-pages, parents first, in tree order. */
async function pagesInTree(
  db: LearningNotesDB,
  root: Page,
  includeSubpages: boolean,
): Promise<Page[]> {
  if (!includeSubpages) return [root]
  const childrenOf = new Map<string | null, Page[]>()
  for (const page of await listPages(db, root.notebookId)) {
    const list = childrenOf.get(page.parentId) ?? []
    list.push(page)
    childrenOf.set(page.parentId, list)
  }
  const result: Page[] = []
  const walk = (page: Page) => {
    result.push(page)
    childrenOf.get(page.id)?.forEach(walk)
  }
  walk(root)
  return result
}

/** The card rows for a Card list block on `pageId`. */
export async function listCardRows(
  db: LearningNotesDB,
  pageId: string,
  includeSubpages: boolean,
  now: number = Date.now(),
): Promise<CardRow[]> {
  const root = await getPage(db, pageId)
  if (!root) return []
  const pages = await pagesInTree(db, root, includeSubpages)
  const cards = await db.cards
    .where('pageId')
    .anyOf(pages.map((p) => p.id))
    .filter((c) => c.deletedAt === null)
    .toArray()
  const cardsOf = new Map<string, Card[]>()
  for (const card of cards) {
    const list = cardsOf.get(card.blockId) ?? []
    list.push(card)
    cardsOf.set(card.blockId, list)
  }

  const pagesWithCards = new Set(cards.map((c) => c.pageId))
  const rows: CardRow[] = []
  for (const page of pages) {
    if (!pagesWithCards.has(page.id)) continue // skip reading empty pages
    for (const block of inReadingOrder(await listBlocks(db, page.id))) {
      const own = cardsOf.get(block.id)
      if (!own || !hasQuestion(block)) continue // empty Cards are left out
      const parts = cardParts(block) // blanks in the order they appear
      own.sort((a, b) => parts.indexOf(a.part) - parts.indexOf(b.part))
      for (const card of own) {
        rows.push({
          cardId: card.id,
          blockId: block.id,
          pageId: page.id,
          pageTitle: page.id === root.id ? null : page.title,
          question: maskedText(
            block.content.text,
            block.type === CARD_BLOCK_TYPE ? undefined : card.part,
          ),
          status: cardStatus(card, now),
          due: card.due,
        })
      }
    }
  }
  return rows
}

/** Due dates further away than this show as a date instead of "in N days". */
const RELATIVE_DAYS = 7

const DAY_MS = 24 * 60 * 60_000

/**
 * A card's status for card lists: "New", "Due", "Suspended", or when a
 * later card comes back. One style everywhere: "in 10 minutes", "tomorrow",
 * "in 3 days" within a week, then a short date ("12 Nov"; with the year
 * when it is not this year).
 */
export function dueLabel(due: number, now: number): string {
  const ms = due - now
  if (ms >= RELATIVE_DAYS * DAY_MS) {
    const sameYear = new Date(due).getFullYear() === new Date(now).getFullYear()
    return new Intl.DateTimeFormat(dateLocale(), {
      day: 'numeric',
      month: 'short',
      year: sameYear ? undefined : 'numeric',
    }).format(due)
  }
  const format = new Intl.RelativeTimeFormat(dateLocale(), {
    numeric: 'auto',
  })
  const minutes = Math.ceil(ms / 60_000)
  if (minutes < 60) return format.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return format.format(hours, 'hour')
  return format.format(Math.round(hours / 24), 'day')
}
