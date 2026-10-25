import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating as FsrsRating,
  type Card as FsrsCard,
  type Grade,
  type State,
} from 'ts-fsrs'
import { addStudyDays } from '../core/time'
import type { Card, JsonObject, Rating } from '../core/types'
import type { Scheduler, SchedulerSettings } from './scheduler'

/**
 * FSRS scheduler (via ts-fsrs). It models each card's memory (stability,
 * difficulty) and picks the gap at which you still remember it with the
 * "Target memory" chance. New and forgotten cards first repeat after
 * "Again" minutes (new cards twice, Anki style) before day gaps begin.
 * Its state lives in `card.schedulerData` (see `FsrsData`).
 */

/** What FSRS keeps on a card, beside the shared card fields. */
interface FsrsData extends JsonObject {
  scheduler: 'fsrs'
  stability: number
  difficulty: number
  /** 0 new, 1 learning, 2 review, 3 relearning. */
  state: number
  /** Position in the short (minutes) steps. */
  learningStep: number
  /** Last normal review (UTC ms), or null. */
  lastReview: number | null
}

const GRADES: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
}

/** Longest gap: 100 years (effectively none). */
const MAX_INTERVAL_DAYS = 36500

function engine({ againMinutes, targetMemory }: SchedulerSettings) {
  const step = `${againMinutes}m` as const
  return fsrs(
    generatorParameters({
      request_retention: targetMemory / 100,
      maximum_interval: MAX_INTERVAL_DAYS,
      // Spreads due dates a little so cards learned together don't clump.
      enable_fuzz: true,
      learning_steps: [step, step],
      relearning_steps: [step],
    }),
  )
}

const isFsrsData = (data: JsonObject | undefined): data is FsrsData =>
  data?.scheduler === 'fsrs'

/** The card as ts-fsrs sees it (a fresh FSRS card if it has no FSRS data). */
function toFsrs(card: Card): FsrsCard {
  const data = card.schedulerData
  if (!isFsrsData(data)) return createEmptyCard(new Date(card.createdAt))
  return {
    due: new Date(card.due),
    stability: data.stability,
    difficulty: data.difficulty,
    elapsed_days: 0,
    scheduled_days: card.intervalDays,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: data.learningStep,
    state: data.state as State,
    last_review:
      data.lastReview === null ? undefined : new Date(data.lastReview),
  }
}

const toData = (c: FsrsCard): FsrsData => ({
  scheduler: 'fsrs',
  stability: c.stability,
  difficulty: c.difficulty,
  state: c.state,
  learningStep: c.learning_steps,
  lastReview: c.last_review ? c.last_review.getTime() : null,
})

export const fsrsScheduler: Scheduler = {
  id: 'fsrs',
  next(card, rating, now, settings) {
    const after = engine(settings).next(
      toFsrs(card),
      new Date(now),
      GRADES[rating],
    ).card
    const days = after.scheduled_days
    return {
      // Day gaps start at the study-day boundary like the fixed scheduler;
      // minute steps use FSRS's exact time.
      due:
        days > 0
          ? addStudyDays(now, days, settings.dayStartHour)
          : after.due.getTime(),
      intervalDays: days,
      // The fixed-steps ladder doesn't apply; it is rebuilt on switching back.
      step: 0,
      lapses: after.lapses,
      schedulerData: toData(after),
    }
  },
  // Replays every normal review through FSRS to estimate the memory state.
  adopt(card, history, settings) {
    const f = engine(settings)
    let c = createEmptyCard(new Date(card.createdAt))
    for (const log of history
      .filter((l) => l.kind === 'review')
      .sort((a, b) => a.createdAt - b.createdAt)) {
      c = f.next(c, new Date(log.createdAt), GRADES[log.rating]).card
    }
    return { ...card, schedulerData: toData(c) }
  },
}
