import type { LearningNotesDB } from '../../core/db'
import { listDecks } from '../../recall/deckService'
import { listPaused } from '../../recall/pauseService'
import { doneToday, getReviewQueue } from '../../recall/reviewService'
import {
  dayStartHour,
  newCardsPerDay,
  reviewsPerDay,
} from '../../settings/builtinSettings'
import { getSetting } from '../../settings/settingsService'
import type { ChipDeck } from './Chips'
import { limitsLeft } from './limits'

export interface HomeExtras {
  decks: ChipDeck[]
  wrongCount: number
  newLeft: number
  reviewsLeft: number | null
  paused: number
}

/** What the Professional home needs besides the hero: chips, limits, paused. */
export async function homeExtras(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<HomeExtras> {
  const [decks, wrong, hour, newLimit, reviewLimit, paused] = await Promise.all(
    [
      listDecks(db),
      getReviewQueue(db, { kind: 'wrong' }, now),
      getSetting(db, dayStartHour),
      getSetting(db, newCardsPerDay),
      getSetting(db, reviewsPerDay),
      listPaused(db),
    ],
  )
  const done = await doneToday(db, now, hour)
  return {
    decks: decks.map((d) => ({ id: d.id, name: d.name, colour: d.colour })),
    wrongCount: wrong.cards.length,
    ...limitsLeft({ newLimit, reviewLimit }, done),
    paused: paused.length,
  }
}
