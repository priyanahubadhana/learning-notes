import type { Card, Rating } from '../core/types'

/**
 * One review session in memory (pure, no database): which card to show
 * next, and where a card goes after it is rated.
 *
 * - A card rated Again on a real review is due again in a few minutes. It
 *   waits, hidden, until then, and comes back first once its time is up.
 * - In Practice anyway, a card that was not due keeps its schedule; Again
 *   puts it back a few cards later instead.
 */

/** How many cards later a practised (not due) Again card comes back. */
export const PRACTICE_REPEAT_GAP = 3

export interface ReviewSession {
  /** Cards still to show, in order. */
  queue: Card[]
  /** Again cards hidden until their `due` time. */
  waiting: Card[]
  /** Cards rated (each rating counts once). */
  done: number
}

export function startSession(cards: Card[]): ReviewSession {
  return { queue: [...cards], waiting: [], done: 0 }
}

/** Moves waiting cards whose time is up to the front of the queue. */
export function releaseWaiting(s: ReviewSession, now: number): ReviewSession {
  const ready = s.waiting.filter((c) => c.due <= now)
  if (ready.length === 0) return s
  return {
    ...s,
    queue: [...ready.sort((a, b) => a.due - b.due), ...s.queue],
    waiting: s.waiting.filter((c) => c.due > now),
  }
}

/** The card to show now, or null (finished, or only waiting cards left). */
export const currentCard = (s: ReviewSession): Card | null => s.queue[0] ?? null

/** When the next waiting card is due (null if none wait). */
export const nextWaitingAt = (s: ReviewSession): number | null =>
  s.waiting.length ? Math.min(...s.waiting.map((c) => c.due)) : null

/**
 * Records the rating of the current card. `after` is the card as saved
 * (rescheduled, or unchanged for cram); `wasDue` tells which rule applied.
 */
export function afterRating(
  s: ReviewSession,
  rating: Rating,
  after: Card,
  wasDue: boolean,
): ReviewSession {
  const rest = s.queue.slice(1)
  const done = s.done + 1
  if (rating !== 'again') return { ...s, queue: rest, done }
  if (wasDue) return { queue: rest, waiting: [...s.waiting, after], done }
  const at = Math.min(PRACTICE_REPEAT_GAP, rest.length)
  return {
    ...s,
    queue: [...rest.slice(0, at), after, ...rest.slice(at)],
    done,
  }
}

/** Takes the current card out (e.g. suspended). */
export const skipCurrent = (s: ReviewSession): ReviewSession => ({
  ...s,
  queue: s.queue.slice(1),
})

/** Puts a card back in front (e.g. Undo suspend). */
export const putBack = (s: ReviewSession, card: Card): ReviewSession => ({
  ...s,
  queue: [card, ...s.queue],
})
