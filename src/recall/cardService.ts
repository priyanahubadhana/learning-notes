import type { LearningNotesDB } from '../core/db'
import { stableId } from '../core/ids'
import { newRecordFields } from '../core/records'
import type { Block, Card, JsonValue } from '../core/types'
import { blankIds, runText } from '../editor/mapping'

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
    // Fixed id from its block and part (sync L1): two devices that make the
    // card of the same block make the same card.
    id: stableId(`card:${block.id}/${part}`),
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

/** Plain text of rich-text runs, with the blank `blankId` shown as "…". */
export function maskedText(runs: JsonValue | undefined, blankId?: string) {
  let out = ''
  let inBlank = false // one "…" per blank, even if split over runs
  const visit = (list: JsonValue | undefined) => {
    if (!Array.isArray(list)) return
    for (const run of list) {
      if (!run || typeof run !== 'object' || Array.isArray(run)) continue
      const styles = run.styles
      const blank =
        styles && typeof styles === 'object' && !Array.isArray(styles)
          ? styles.blank
          : undefined
      if (blankId !== undefined && blank === blankId) {
        if (!inBlank) out += '…'
        inBlank = true
        continue
      }
      inBlank = false
      out += runText(run) // text, or a note link's label
      visit(run.content) // links hold their own runs
    }
  }
  visit(runs)
  return out.trim()
}

/**
 * False for a Card block whose question has no text yet. Such cards stay
 * saved but are left out of reviews and card lists until a question is
 * typed. (A blank always has text, so blank cards always count.)
 */
export function hasQuestion(block: Pick<Block, 'type' | 'content'>): boolean {
  return block.type !== CARD_BLOCK_TYPE || maskedText(block.content.text) !== ''
}

/** A card is new until its first normal review. */
export const isNewCard = (card: Card): boolean => card.reps === 0
