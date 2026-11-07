import type { LearningNotesDB } from '../core/db'
import { localDay } from './formula/formulaValue'

/**
 * Review history of a notebook for the Study tracker dashboard: how many
 * answers each day, and how many were right (not Again). Days are the
 * user's own calendar days. Pure apart from `loadReviewHistory`.
 */

const DAY = 86_400_000
/** How far back the history reaches. */
const HISTORY_DAYS = 366

export interface DayCount {
  answered: number
  correct: number
}

/** Answers by day ("YYYY-MM-DD"). */
export type ReviewHistory = Map<string, DayCount>

/** The notebook's answers (reviews and Practice anyway) of the last year. */
export async function loadReviewHistory(
  db: LearningNotesDB,
  notebookId: string,
  now: number = Date.now(),
): Promise<ReviewHistory> {
  const cardIds = new Set(
    await db.cards.where('notebookId').equals(notebookId).primaryKeys(),
  )
  const history: ReviewHistory = new Map()
  if (cardIds.size === 0) return history
  await db.reviewLogs
    .where('createdAt')
    .aboveOrEqual(now - HISTORY_DAYS * DAY)
    .each((log) => {
      if (log.purgedAt !== undefined || !cardIds.has(log.cardId)) return
      const day = localDay(log.createdAt)
      const count = history.get(day) ?? { answered: 0, correct: 0 }
      count.answered++
      if (log.rating !== 'again') count.correct++
      history.set(day, count)
    })
  return history
}

const dayBefore = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number)
  return localDay(new Date(y, m - 1, d - 1, 12).getTime())
}

/**
 * Days in a row with at least one answer, up to today (a day not over yet
 * does not break it: it counts from yesterday), and the best run in the
 * history.
 */
export function studyStreak(
  history: ReviewHistory,
  now: number = Date.now(),
): { current: number; best: number } {
  const studied = (day: string) => (history.get(day)?.answered ?? 0) > 0
  const today = localDay(now)
  let current = 0
  for (
    let day = studied(today) ? today : dayBefore(today);
    studied(day);
    day = dayBefore(day)
  ) {
    current++
  }
  let best = 0
  let run = 0
  let previous = ''
  for (const day of [...history.keys()].filter(studied).sort()) {
    run = previous !== '' && dayBefore(day) === previous ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }
  return { current, best }
}
