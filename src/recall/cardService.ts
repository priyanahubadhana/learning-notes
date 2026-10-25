import type { LearningNotesDB } from '../core/db'
import { newRecordFields } from '../core/records'
import type { Block, Card } from '../core/types'

/**
 * Recall cards: the scheduling records behind Card blocks (and, from step 4,
 * fill-in-the-blanks). The card's text lives in its block; this service only
 * makes sure every card has a scheduling record. Records are never deleted:
 * if a Card block is turned back into text (e.g. Undo), its record stays, so
 * redoing it keeps the review history. Reviews skip cards whose block is no
 * longer a live card.
 */

/** Block type name of a Card block (question = text, answer = children). */
export const CARD_BLOCK_TYPE = 'card'

/** Card part for the single card a Card block makes. */
export const MAIN_PART = 'main'

/** A brand-new card: due straight away, on the first step. */
export function newCard(
  block: Pick<Block, 'id' | 'pageId'>,
  notebookId: string,
  part: string,
  now: number = Date.now(),
): Card {
  return {
    ...newRecordFields(),
    createdAt: now,
    updatedAt: now,
    blockId: block.id,
    part,
    pageId: block.pageId,
    notebookId,
    due: now,
    intervalDays: 0,
    step: 0,
    reps: 0,
    lapses: 0,
    suspendedAt: null,
  }
}

/**
 * Creates missing card records for the live Card blocks on a page. Safe to
 * call after every save: existing records are left untouched.
 */
export async function syncCardRecords(
  db: LearningNotesDB,
  pageId: string,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.pages, db.blocks, db.cards, async () => {
    const page = await db.pages.get(pageId)
    if (!page) return
    const cardBlocks = await db.blocks
      .where('pageId')
      .equals(pageId)
      .filter((b) => b.type === CARD_BLOCK_TYPE && b.deletedAt === null)
      .toArray()
    if (cardBlocks.length === 0) return

    const existing = await db.cards
      .where('blockId')
      .anyOf(cardBlocks.map((b) => b.id))
      .toArray()
    const hasCard = new Set(
      existing.filter((c) => c.part === MAIN_PART).map((c) => c.blockId),
    )
    const missing = cardBlocks
      .filter((b) => !hasCard.has(b.id))
      .map((b) => newCard(b, page.notebookId, MAIN_PART, now))
    if (missing.length > 0) await db.cards.bulkAdd(missing)
  })
}
