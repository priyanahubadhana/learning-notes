import type { LearningNotesDB } from '../core/db'
import { newRecordFields } from '../core/records'
import type { Block, Card } from '../core/types'
import { blankIds } from '../editor/mapping'

/**
 * Recall cards: the scheduling records behind Card blocks and
 * fill-in-the-blanks (one card per blank; part = the blank's id). The card's
 * text lives in its block; this service only makes sure every card has a
 * scheduling record. Records are never deleted:
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

/** The cards a block makes: its Card (if it is one) plus one per blank. */
export function cardParts(block: Pick<Block, 'type' | 'content'>): string[] {
  return [
    ...(block.type === CARD_BLOCK_TYPE ? [MAIN_PART] : []),
    ...blankIds(block.content),
  ]
}

/**
 * Creates missing card records for the live Card blocks and blanks on a
 * page. Safe to call after every save: existing records are left untouched.
 */
export async function syncCardRecords(
  db: LearningNotesDB,
  pageId: string,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.pages, db.blocks, db.cards, async () => {
    const page = await db.pages.get(pageId)
    if (!page) return
    const blocks = await db.blocks
      .where('pageId')
      .equals(pageId)
      .filter((b) => b.deletedAt === null)
      .toArray()
    const wanted = blocks.flatMap((block) =>
      cardParts(block).map((part) => ({ block, part })),
    )
    if (wanted.length === 0) return

    const existing = await db.cards
      .where('blockId')
      .anyOf([...new Set(wanted.map((w) => w.block.id))])
      .toArray()
    const has = new Set(existing.map((c) => `${c.blockId}/${c.part}`))
    const missing = wanted
      .filter(({ block, part }) => !has.has(`${block.id}/${part}`))
      .map(({ block, part }) => newCard(block, page.notebookId, part, now))
    if (missing.length > 0) await db.cards.bulkAdd(missing)
  })
}
