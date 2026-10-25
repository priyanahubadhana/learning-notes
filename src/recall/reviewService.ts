import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { addStudyDays, studyDayStart } from '../core/time'
import { listBlocks } from '../core/blockService'
import type { Card, JsonValue, Rating, ReviewLog } from '../core/types'
import {
  againMinutes,
  dayStartHour,
  goodSteps,
  newCardsPerDay,
  reviewsPerDay,
} from '../settings/builtinSettings'
import { getSetting } from '../settings/settingsService'
import { cardParts, MAIN_PART } from './cardService'
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

/** Cards per round of Practice anyway. */
export const PRACTICE_ROUND = 50
const PRACTICE_CHUNK = 200

/**
 * Cards for Practice anyway: every active card in the scope, soonest due
 * first, up to `limit`. Not-due cards keep their schedule when rated
 * (cram); due ones count normally. 'missed' has no practice round.
 */
export async function getPracticeCards(
  db: LearningNotesDB,
  scope: ReviewScope,
  limit = PRACTICE_ROUND,
): Promise<Card[]> {
  const byDue = (a: Card, b: Card) => a.due - b.due || a.createdAt - b.createdAt
  switch (scope.kind) {
    case 'missed':
      return []
    case 'all': {
      // Walk the `due` index in chunks so a huge collection is never loaded.
      const picked: Card[] = []
      for (let offset = 0; picked.length < limit; offset += PRACTICE_CHUNK) {
        const chunk = await db.cards
          .orderBy('due')
          .offset(offset)
          .limit(PRACTICE_CHUNK)
          .toArray()
        if (chunk.length === 0) break
        picked.push(...(await reviewable(db, chunk)))
      }
      return picked.slice(0, limit)
    }
    case 'notebook':
    case 'page': {
      const cards =
        scope.kind === 'page'
          ? db.cards.where('pageId').equals(scope.pageId)
          : db.cards.where('notebookId').equals(scope.notebookId)
      const all = await reviewable(db, await cards.toArray())
      return all.sort(byDue).slice(0, limit)
    }
  }
}

/** What a card shows: the question (with its blank hidden) and the answer. */
export interface CardFace {
  kind: 'card' | 'blank'
  /** The block's text runs (`content.text`). */
  text: JsonValue
  /** For a blank: the blank id to hide until revealed. */
  blankId?: string
  /** For a Card block: the answer blocks (all nested blocks, in order). */
  answer: { id: string; text: JsonValue; depth: number }[]
  pageTitle: string
}

/** Loads what to show for a card (null if its block is gone). */
export async function getCardFace(
  db: LearningNotesDB,
  card: Card,
): Promise<CardFace | null> {
  const [block, page] = await Promise.all([
    db.blocks.get(card.blockId),
    db.pages.get(card.pageId),
  ])
  if (!block || block.deletedAt !== null) return null
  const base = { text: block.content.text ?? [], pageTitle: page?.title ?? '' }
  if (card.part !== MAIN_PART) {
    return { ...base, kind: 'blank', blankId: card.part, answer: [] }
  }

  // The answer = the Card block's children (and theirs), in page order.
  const blocks = await listBlocks(db, card.pageId)
  const answer: CardFace['answer'] = []
  const addChildren = (parentId: string, depth: number) => {
    for (const child of blocks.filter((b) => b.parentId === parentId)) {
      answer.push({ id: child.id, text: child.content.text ?? [], depth })
      addChildren(child.id, depth + 1)
    }
  }
  addChildren(block.id, 0)
  return { ...base, kind: 'card', answer }
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

/** How many cards are due now across everything (the sidebar count). */
export async function countDue(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<number> {
  return (await getReviewQueue(db, { kind: 'all' }, now)).cards.length
}
