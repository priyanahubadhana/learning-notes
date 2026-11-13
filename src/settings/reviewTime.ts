import type { LearningNotesDB } from '../core/db'

/**
 * "About N min a day" under the new-cards limit (polish 1, item 10): the
 * limit times how long a review really takes you, from your own history.
 * Honest numbers: until there are enough reviews, an assumed 8 seconds.
 */

/** Seconds per review assumed until there is history. */
export const FALLBACK_SECONDS = 8
/** Fewer reviews than this and the history is too thin to trust. */
const MIN_REVIEWS = 20
/** Looks at the latest reviews only. */
const SAMPLE = 300

/** Average seconds per review from durations in ms (outliers clipped). */
export function averageSeconds(durationsMs: readonly number[]): number {
  const usable = durationsMs
    .filter((d) => Number.isFinite(d) && d > 0)
    // A card left open while the phone slept is not a review time.
    .map((d) => Math.min(d, 60_000))
  if (usable.length < MIN_REVIEWS) return FALLBACK_SECONDS
  const sum = usable.reduce((n, d) => n + d, 0)
  return Math.max(1, sum / usable.length / 1000)
}

/** Whole minutes for `cards` reviews at `seconds` each (at least 1 if any). */
export function estimateMinutes(cards: number, seconds: number): number {
  if (cards <= 0) return 0
  return Math.max(1, Math.round((cards * seconds) / 60))
}

/** Your average seconds per review, from the latest reviews. */
export async function averageReviewSeconds(
  db: LearningNotesDB,
): Promise<number> {
  const logs = await db.reviewLogs
    .orderBy('createdAt')
    .reverse()
    .filter((l) => l.kind === 'review' && l.purgedAt === undefined)
    .limit(SAMPLE)
    .toArray()
  return averageSeconds(logs.map((l) => l.durationMs))
}
