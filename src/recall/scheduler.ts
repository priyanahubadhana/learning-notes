import { addStudyDays } from '../core/time'
import { fsrsScheduler } from './fsrsScheduler'
import type { Card, JsonObject, Rating, ReviewLog } from '../core/types'

/**
 * Schedulers decide when a card comes back after a rating. They are pure
 * (no database, no clock of their own) and swappable: the review service
 * only talks to this interface (fixed steps here, FSRS in
 * `fsrsScheduler.ts`).
 */

/** The four ratings, in button order (keys 1–4). */
export const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy']

/** Settings a scheduler needs; read fresh before every preview/rating. */
export interface SchedulerSettings {
  /** Minutes until a forgotten card comes back. */
  againMinutes: number
  /** Rising gaps in days for each Good (e.g. [1, 3, 7, 14, 30, 60]). */
  goodSteps: number[]
  /** Local hour when a new study day begins. */
  dayStartHour: number
  /** FSRS: chance (%) of still remembering a card when it comes back. */
  targetMemory: number
}

/** The card fields a scheduler may change. */
export type ScheduleState = Pick<
  Card,
  'due' | 'intervalDays' | 'step' | 'lapses'
> & { schedulerData?: JsonObject }

export interface Scheduler {
  /** Stored in each review log entry, e.g. 'fixed'. */
  id: string
  next(
    card: Card,
    rating: Rating,
    now: number,
    settings: SchedulerSettings,
  ): ScheduleState
  /**
   * The card ready for `next` when another scheduler (or none) handled it
   * last: fills in this scheduler's state from the card's review history.
   * Keeps the card's due date, so switching never moves cards.
   */
  adopt(card: Card, history: ReviewLog[], settings: SchedulerSettings): Card
}

/** Id of the scheduler that last scheduled a card ('fixed' keeps no data). */
export const scheduledBy = (card: Card): string => {
  const id = card.schedulerData?.scheduler
  return typeof id === 'string' ? id : fixedStepsSchedulerId
}

const fixedStepsSchedulerId = 'fixed'

const MINUTE_MS = 60_000

/**
 * Fixed-steps scheduler. `step` counts how far up the Good ladder a card
 * is (0 = new or just forgotten). Good climbs one step, Easy two, Hard
 * stays, Again drops back to 0 and returns after `againMinutes`. A card's
 * gap is the ladder value of its step; at the top it stays there. If the
 * ladder is shortened in settings, cards above it act as being at the top.
 */
export const fixedStepsScheduler: Scheduler = {
  id: fixedStepsSchedulerId,
  // The step whose gap matches the card's current gap (0 while learning).
  adopt(card, _history, { goodSteps }) {
    const step = goodSteps.filter((days) => days <= card.intervalDays).length
    return { ...card, step, schedulerData: undefined }
  },
  next(card, rating, now, { againMinutes, goodSteps, dayStartHour }) {
    if (rating === 'again') {
      return {
        due: now + againMinutes * MINUTE_MS,
        intervalDays: 0,
        step: 0,
        // Only forgetting a card that had been learned counts as a lapse.
        lapses: card.lapses + (card.intervalDays > 0 ? 1 : 0),
      }
    }
    const top = goodSteps.length
    const current = Math.min(card.step, top)
    const climb = rating === 'easy' ? 2 : rating === 'good' ? 1 : 0
    const step = Math.min(current + climb, top)
    // Hard on a new card still waits the first gap rather than 0 days.
    const intervalDays = goodSteps[Math.max(step, 1) - 1]
    return {
      due: addStudyDays(now, intervalDays, dayStartHour),
      intervalDays,
      step,
      lapses: card.lapses,
    }
  },
}

/** Schedulers by id (the "Scheduler" setting picks one). */
export const schedulers: Record<string, Scheduler> = {
  [fixedStepsScheduler.id]: fixedStepsScheduler,
  [fsrsScheduler.id]: fsrsScheduler,
}

/** What each button would do right now (shown on the Review buttons). */
export function previewRatings(
  card: Card,
  now: number,
  settings: SchedulerSettings,
  scheduler: Scheduler = fixedStepsScheduler,
): Record<Rating, ScheduleState> {
  return Object.fromEntries(
    RATINGS.map((r) => [r, scheduler.next(card, r, now, settings)]),
  ) as Record<Rating, ScheduleState>
}
