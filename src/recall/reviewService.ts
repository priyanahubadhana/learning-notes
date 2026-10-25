import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { addStudyDays, studyDayStart } from '../core/time'
import type { Card, Rating, ReviewLog } from '../core/types'
import {
  againMinutes,
  dayStartHour,
  goodSteps,
  newCardsPerDay,
  reviewsPerDay,
} from '../settings/builtinSettings'
import { getSetting } from '../settings/settingsService'
import { cardParts } from './cardService'
import {
  fixedStepsScheduler,
  previewRatings,
  type ScheduleState,
  type Scheduler,
  type SchedulerSettings,
} from './scheduler'

/**
 * Reviewing cards: building the review queue, rating a card (which writes
 * one append-only review log entry and updates the card together), and
 * suspending. All reads go through the `due` / `pageId` / `notebookId`
 * indexes so the queue stays fast with tens of thousands of cards.
 */

/** Which cards to review. 'missed' = came due in the last 7 study days. */
export type ReviewScope =
  | { kind: 'all' }
  | { kind: 'notebook'; notebookId: string }
  | { kind: 'page'; pageId: string }
  | { kind: 'missed' }

export interface ReviewQueue {
  /** Cards in the order to show them: due reviews first, then new cards. */
  cards: Card[]
  reviewCount: number
  newCount: number
}

const MISSED_DAYS = 7

/** Reads the scheduler settings fresh, so previews match current settings. */
export async function getSchedulerSettings(
  db: LearningNotesDB,
): Promise<SchedulerSettings> {
  const [minutes, steps, hour] = await Promise.all([
    getSetting(db, againMinutes),
    getSetting(db, goodSteps),
    getSetting(db, dayStartHour),
  ])
  return { againMinutes: minutes, goodSteps: steps, dayStartHour: hour }
}

/** A card is new until its first normal review. */
export const isNewCard = (card: Card): boolean => card.reps === 0

/** Next state for each button, using the current settings. */
export async function previewCard(
  db: LearningNotesDB,
  card: Card,
  now: number = Date.now(),
  scheduler: Scheduler = fixedStepsScheduler,
): Promise<Record<Rating, ScheduleState>> {
  return previewRatings(card, now, await getSchedulerSettings(db), scheduler)
}

/** Cards due by `now` in the scope (unfiltered). */
async function dueCardsInScope(
  db: LearningNotesDB,
  scope: ReviewScope,
  now: number,
  hour: number,
): Promise<Card[]> {
  switch (scope.kind) {
    case 'all':
      return db.cards.where('due').belowOrEqual(now).toArray()
    case 'missed': {
      const from = addStudyDays(now, -MISSED_DAYS, hour)
      const to = studyDayStart(now, hour)
      const cards = await db.cards.where('due').between(from, to).toArray()
      return cards.filter((c) => !isNewCard(c))
    }
    case 'notebook':
      return db.cards
        .where('notebookId')
        .equals(scope.notebookId)
        .filter((c) => c.due <= now)
        .toArray()
    case 'page':
      return db.cards
        .where('pageId')
        .equals(scope.pageId)
        .filter((c) => c.due <= now)
        .toArray()
  }
}

/**
 * Keeps only cards that should be reviewed: not suspended, block still
 * live and still making that card, and not in the Templates notebook.
 */
async function reviewable(db: LearningNotesDB, cards: Card[]): Promise<Card[]> {
  const active = cards.filter((c) => c.suspendedAt === null)
  if (active.length === 0) return []
  const blockIds = [...new Set(active.map((c) => c.blockId))]
  const [blocks, templateNotebooks] = await Promise.all([
    db.blocks.bulkGet(blockIds),
    db.notebooks.filter((n) => n.kind === 'templates').primaryKeys(),
  ])
  const parts = new Map<string, Set<string>>()
  blocks.forEach((b) => {
    if (b && b.deletedAt === null) parts.set(b.id, new Set(cardParts(b)))
  })
  const skip = new Set(templateNotebooks)
  return active.filter(
    (c) => parts.get(c.blockId)?.has(c.part) && !skip.has(c.notebookId),
  )
}

/** Normal reviews done today, split into new cards and reviews. */
async function doneToday(
  db: LearningNotesDB,
  now: number,
  hour: number,
): Promise<{ newDone: number; reviewsDone: number }> {
  const logs = await db.reviewLogs
    .where('createdAt')
    .aboveOrEqual(studyDayStart(now, hour))
    .filter((l) => l.kind === 'review')
    .toArray()
  const newDone = logs.filter((l) => l.isNew).length
  return { newDone, reviewsDone: logs.length - newDone }
}

/**
 * The review queue for a scope: due reviews (most overdue first, up to the
 * optional daily cap) followed by new cards (oldest first, up to the
 * new-cards-per-day limit). Limits count what was already done today.
 */
export async function getReviewQueue(
  db: LearningNotesDB,
  scope: ReviewScope,
  now: number = Date.now(),
): Promise<ReviewQueue> {
  const [hour, newLimit, reviewLimit] = await Promise.all([
    getSetting(db, dayStartHour),
    getSetting(db, newCardsPerDay),
    getSetting(db, reviewsPerDay),
  ])
  const [due, done] = await Promise.all([
    dueCardsInScope(db, scope, now, hour).then((c) => reviewable(db, c)),
    doneToday(db, now, hour),
  ])

  const byDue = (a: Card, b: Card) => a.due - b.due || a.createdAt - b.createdAt
  const reviewsLeft =
    reviewLimit === null
      ? Infinity
      : Math.max(0, reviewLimit - done.reviewsDone)
  const reviews = due
    .filter((c) => !isNewCard(c))
    .sort(byDue)
    .slice(0, reviewsLeft)
  const fresh = due
    .filter(isNewCard)
    .sort(byDue)
    .slice(0, Math.max(0, newLimit - done.newDone))

  return {
    cards: [...reviews, ...fresh],
    reviewCount: reviews.length,
    newCount: fresh.length,
  }
}

export interface RateOptions {
  /** Time from showing the card to rating it. */
  durationMs: number
  now?: number
  scheduler?: Scheduler
}

/**
 * Rates a card. A due card is rescheduled; a card that is not due yet
 * (Practice anyway) is logged as 'cram' and left unchanged. The log entry
 * and the card update are saved in one transaction, so they never disagree.
 */
export async function rateCard(
  db: LearningNotesDB,
  cardId: string,
  rating: Rating,
  {
    durationMs,
    now = Date.now(),
    scheduler = fixedStepsScheduler,
  }: RateOptions,
): Promise<{ card: Card; log: ReviewLog }> {
  const settings = await getSchedulerSettings(db)
  return db.transaction('rw', db.cards, db.reviewLogs, async () => {
    const card = await db.cards.get(cardId)
    if (!card) throw new Error('Card not found')

    const isDue = card.due <= now
    const next: ScheduleState = isDue
      ? scheduler.next(card, rating, now, settings)
      : card
    const log: ReviewLog = {
      id: createId(),
      cardId,
      rating,
      createdAt: now,
      durationMs: Math.max(0, Math.round(durationMs)),
      kind: isDue ? 'review' : 'cram',
      scheduler: scheduler.id,
      dueBefore: card.due,
      dueAfter: next.due,
      intervalBefore: card.intervalDays,
      intervalAfter: next.intervalDays,
      stepAfter: next.step,
      isNew: isDue && isNewCard(card),
      ...(next.schedulerData && { schedulerDataAfter: next.schedulerData }),
    }
    await db.reviewLogs.add(log)
    if (!isDue) return { card, log }

    const updated: Card = {
      ...card,
      due: next.due,
      intervalDays: next.intervalDays,
      step: next.step,
      lapses: next.lapses,
      reps: card.reps + 1,
      updatedAt: now,
      ...(next.schedulerData && { schedulerData: next.schedulerData }),
    }
    await db.cards.put(updated)
    return { card: updated, log }
  })
}

/**
 * Rebuilds a card's schedule from its review log alone (pure). `card`
 * supplies the fixed fields (ids, createdAt, suspension); its schedule is
 * replaced by replaying the entries.
 */
export function rebuildCard(card: Card, logs: ReviewLog[]): Card {
  const reviews = logs
    .filter((l) => l.kind === 'review')
    .sort((a, b) => a.createdAt - b.createdAt)
  const last = reviews.at(-1)
  if (!last) {
    return {
      ...card,
      due: card.createdAt,
      intervalDays: 0,
      step: 0,
      reps: 0,
      lapses: 0,
    }
  }
  return {
    ...card,
    due: last.dueAfter,
    intervalDays: last.intervalAfter,
    step: last.stepAfter,
    reps: reviews.length,
    lapses: reviews.filter((l) => l.rating === 'again' && l.intervalBefore > 0)
      .length,
    updatedAt: Math.max(card.updatedAt, last.createdAt),
    ...(last.schedulerDataAfter && { schedulerData: last.schedulerDataAfter }),
  }
}

/** Rebuilds a stored card from its log and saves it. */
export async function rebuildCardFromLog(
  db: LearningNotesDB,
  cardId: string,
): Promise<Card> {
  return db.transaction('rw', db.cards, db.reviewLogs, async () => {
    const card = await db.cards.get(cardId)
    if (!card) throw new Error('Card not found')
    const logs = await db.reviewLogs.where('cardId').equals(cardId).toArray()
    const rebuilt = rebuildCard(card, logs)
    await db.cards.put(rebuilt)
    return rebuilt
  })
}

/** Suspended cards stay saved (with history) but never appear in reviews. */
export async function suspendCard(
  db: LearningNotesDB,
  cardId: string,
  now: number = Date.now(),
): Promise<void> {
  await db.cards.update(cardId, { suspendedAt: now, updatedAt: now })
}

export async function unsuspendCard(
  db: LearningNotesDB,
  cardId: string,
  now: number = Date.now(),
): Promise<void> {
  await db.cards.update(cardId, { suspendedAt: null, updatedAt: now })
}
