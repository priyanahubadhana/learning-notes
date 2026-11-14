import type { LearningNotesDB } from '../../core/db'
import type { Card, Rating } from '../../core/types'
import type { ReviewSession } from '../../recall/reviewSession'

/**
 * Undo of the LAST answer of the open session (spec D3).
 *
 * Rating a card writes one append-only `ReviewLog` row and updates the card
 * (`rateCard`). Undo puts the card back exactly as it was and marks that log
 * row with the existing `purgedAt` field. The row is not deleted, and every
 * reader that already skips `purgedAt` rows (the Study tracker, "last answer",
 * today's limits, the rebuild from the log) now skips it too.
 */
export interface LastAnswer {
  /** The card as saved just before the rating (read fresh from the database). */
  before: Card
  /** The card as `rateCard` saved it. */
  after: Card
  logId: string
  rating: Rating
}

export type UndoResult = 'ok' | 'changed'

/** Same stored value? Missing and undefined fields count as equal (they are not stored). */
export function sameCard(a: Card, b: Card): boolean {
  return canonical(a) === canonical(b)
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([x], [y]) =>
            x < y ? -1 : x > y ? 1 : 0,
          ),
        )
      : v,
  )
}

/**
 * Restores the card and marks the log row, in one transaction. Refuses (and
 * changes nothing) when the card is no longer the one that rating saved, for
 * example it was suspended or edited in another tab.
 */
export async function undoRating(
  db: LearningNotesDB,
  last: LastAnswer,
  now: number = Date.now(),
): Promise<UndoResult> {
  return db.transaction('rw', db.cards, db.reviewLogs, async () => {
    const current = await db.cards.get(last.after.id)
    const log = await db.reviewLogs.get(last.logId)
    if (!current || !log || !sameCard(current, last.after)) return 'changed'
    // updatedAt moves forward so sync sees the restore as the newest edit.
    await db.cards.put({
      ...last.before,
      updatedAt: Math.max(now, last.before.updatedAt),
    })
    await db.reviewLogs.update(last.logId, { purgedAt: now })
    return 'ok'
  })
}

/**
 * The in-memory session after an undo: the card comes back as the current
 * one (wherever the rating had put it), and the answered count goes down.
 */
export function undoInSession(
  s: ReviewSession,
  before: Card,
  after: Card,
): ReviewSession {
  const other = (c: Card) => c.id !== after.id
  return {
    queue: [before, ...s.queue.filter(other)],
    waiting: s.waiting.filter(other),
    done: Math.max(0, s.done - 1),
  }
}
