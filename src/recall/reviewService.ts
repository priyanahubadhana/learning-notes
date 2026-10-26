import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { descendantIds } from '../core/records'
import { addStudyDays, studyDayStart } from '../core/time'
import { listBlocks } from '../core/blockService'
import type {
  Card,
  JsonObject,
  JsonValue,
  Rating,
  ReviewLog,
} from '../core/types'
import {
  againMinutes,
  dayStartHour,
  goodSteps,
  newCardsPerDay,
  practiceOrder,
  reviewsPerDay,
  schedulerChoice,
  targetMemory,
} from '../settings/builtinSettings'
import { getSetting } from '../settings/settingsService'
import { listPages } from '../pages/pageService'
import { cardParts, hasQuestion, MAIN_PART } from './cardService'
import { fsrsScheduler } from './fsrsScheduler'
import {
  previewRatings,
  scheduledBy,
  schedulers,
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

/** Which cards to review. 'wrong' = rated Again in the last 7 study days. */
export type ReviewScope =
  | { kind: 'all' }
  | { kind: 'notebook'; notebookId: string }
  /** includeSubpages: also the page's sub-pages (any depth). */
  | { kind: 'page'; pageId: string; includeSubpages?: boolean }
  | { kind: 'wrong' }
  /** The cards of these blocks, e.g. a search's results; `name` is shown. */
  | { kind: 'blocks'; blockIds: string[]; name: string }

export interface ReviewQueue {
  /** Cards in the order to show them: due reviews first, then new cards. */
  cards: Card[]
  reviewCount: number
  newCount: number
}

const WRONG_DAYS = 7

/** Reads the scheduler settings fresh, so previews match current settings. */
export async function getSchedulerSettings(
  db: LearningNotesDB,
): Promise<SchedulerSettings> {
  const [minutes, steps, hour, target] = await Promise.all([
    getSetting(db, againMinutes),
    getSetting(db, goodSteps),
    getSetting(db, dayStartHour),
    getSetting(db, targetMemory),
  ])
  return {
    againMinutes: minutes,
    goodSteps: steps,
    dayStartHour: hour,
    targetMemory: target,
  }
}

/** The scheduler picked in Settings › Review. */
export async function getScheduler(db: LearningNotesDB): Promise<Scheduler> {
  return schedulers[await getSetting(db, schedulerChoice)] ?? fsrsScheduler
}

/**
 * The card ready for `scheduler`: if another scheduler handled it last,
 * the new one takes over using the card's review history (due date kept).
 */
async function readyFor(
  db: LearningNotesDB,
  card: Card,
  scheduler: Scheduler,
  settings: SchedulerSettings,
): Promise<Card> {
  if (scheduledBy(card) === scheduler.id) return card
  const history = await db.reviewLogs.where('cardId').equals(card.id).toArray()
  return scheduler.adopt(card, history, settings)
}

/** A card is new until its first normal review. */
export const isNewCard = (card: Card): boolean => card.reps === 0

/** Next state for each button, using the current settings. */
export async function previewCard(
  db: LearningNotesDB,
  card: Card,
  now: number = Date.now(),
  scheduler?: Scheduler,
): Promise<Record<Rating, ScheduleState>> {
  const settings = await getSchedulerSettings(db)
  const using = scheduler ?? (await getScheduler(db))
  const ready = await readyFor(db, card, using, settings)
  return previewRatings(ready, now, settings, using)
}

/** Cards due by `now` in the scope (unfiltered). */
async function dueCardsInScope(
  db: LearningNotesDB,
  scope: Exclude<ReviewScope, { kind: 'wrong' }>,
  now: number,
): Promise<Card[]> {
  switch (scope.kind) {
    case 'all':
      return db.cards.where('due').belowOrEqual(now).toArray()
    case 'notebook':
      return db.cards
        .where('notebookId')
        .equals(scope.notebookId)
        .filter((c) => c.due <= now)
        .toArray()
    case 'page':
      return db.cards
        .where('pageId')
        .anyOf(await pageIdsInScope(db, scope))
        .filter((c) => c.due <= now)
        .toArray()
    case 'blocks':
      return db.cards
        .where('blockId')
        .anyOf(scope.blockIds)
        .filter((c) => c.due <= now)
        .toArray()
  }
}

/** The page, plus its sub-pages (any depth) when the scope asks for them. */
async function pageIdsInScope(
  db: LearningNotesDB,
  scope: Extract<ReviewScope, { kind: 'page' }>,
): Promise<string[]> {
  if (!scope.includeSubpages) return [scope.pageId]
  const page = await db.pages.get(scope.pageId)
  if (!page) return [scope.pageId]
  const pages = await listPages(db, page.notebookId)
  return [scope.pageId, ...descendantIds(pages, scope.pageId)]
}

/**
 * Keeps only cards that should be reviewed: not suspended, block still
 * live and still making that card, a Card with a question (empty ones
 * wait until one is typed), and not in the Templates notebook.
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
    if (b && b.deletedAt === null && hasQuestion(b)) {
      parts.set(b.id, new Set(cardParts(b)))
    }
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
  if (scope.kind === 'wrong') {
    const cards = await wrongCards(db, now, hour)
    return { cards, reviewCount: cards.length, newCount: 0 }
  }
  const [due, done] = await Promise.all([
    dueCardsInScope(db, scope, now).then((c) => reviewable(db, c)),
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

/**
 * Cards rated Again in the last 7 study days, soonest due first. They are
 * mostly not due yet, so rating them is practice (schedule unchanged).
 */
async function wrongCards(
  db: LearningNotesDB,
  now: number,
  hour: number,
): Promise<Card[]> {
  const ids = await wrongCardIds(db, now, hour)
  const cards = (await db.cards.bulkGet([...ids])).filter((c) => !!c)
  return (await reviewable(db, cards)).sort(
    (a, b) => a.due - b.due || a.createdAt - b.createdAt,
  )
}

/** Ids of the cards rated Again in the last 7 study days ("Got wrong"). */
export async function wrongCardIds(
  db: LearningNotesDB,
  now: number = Date.now(),
  hour?: number,
): Promise<Set<string>> {
  const dayStart = hour ?? (await getSetting(db, dayStartHour))
  const logs = await db.reviewLogs
    .where('createdAt')
    .aboveOrEqual(addStudyDays(now, -WRONG_DAYS, dayStart))
    .filter((l) => l.rating === 'again')
    .toArray()
  return new Set(logs.map((l) => l.cardId))
}

/**
 * Whether rating `card` now is a normal review (true) or practice that
 * leaves its schedule alone (false): not due yet, or a new card beyond
 * today's new-card limit (it stays new and joins reviews on a later day).
 */
export async function countsAsReview(
  db: LearningNotesDB,
  card: Card,
  now: number = Date.now(),
): Promise<boolean> {
  if (card.due > now) return false
  if (!isNewCard(card)) return true
  const [hour, limit] = await Promise.all([
    getSetting(db, dayStartHour),
    getSetting(db, newCardsPerDay),
  ])
  return (await doneToday(db, now, hour)).newDone < limit
}

/** Cards per round of Practice anyway. */
export const PRACTICE_ROUND = 50
const PRACTICE_CHUNK = 200

/**
 * Cards for Practice anyway: every active card in the scope, soonest due
 * first, up to `limit`; with the "Shuffle" setting, those same cards in
 * random order (`random` is for tests). Not-due cards keep their schedule when rated
 * (cram); due ones count normally, except new cards beyond today's limit
 * (see `countsAsReview`). 'wrong' has no practice round: it already is one.
 */
export async function getPracticeCards(
  db: LearningNotesDB,
  scope: ReviewScope,
  limit = PRACTICE_ROUND,
  random: () => number = Math.random,
): Promise<Card[]> {
  const [cards, order] = await Promise.all([
    soonestDue(db, scope, limit),
    getSetting(db, practiceOrder),
  ])
  return order === 'shuffle' ? shuffled(cards, random) : cards
}

/** Fisher–Yates shuffle into a new array. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

async function soonestDue(
  db: LearningNotesDB,
  scope: ReviewScope,
  limit: number,
): Promise<Card[]> {
  const byDue = (a: Card, b: Card) => a.due - b.due || a.createdAt - b.createdAt
  switch (scope.kind) {
    case 'wrong':
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
    case 'page':
    case 'blocks': {
      const cards =
        scope.kind === 'page'
          ? db.cards.where('pageId').anyOf(await pageIdsInScope(db, scope))
          : scope.kind === 'blocks'
            ? db.cards.where('blockId').anyOf(scope.blockIds)
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
 * Rates a card. A normal review reschedules it; practice (see
 * `countsAsReview`) is logged as 'cram' and leaves the card unchanged. The log entry
 * and the card update are saved in one transaction, so they never disagree.
 */
export async function rateCard(
  db: LearningNotesDB,
  cardId: string,
  rating: Rating,
  { durationMs, now = Date.now(), scheduler: picked }: RateOptions,
): Promise<{ card: Card; log: ReviewLog }> {
  const settings = await getSchedulerSettings(db)
  const scheduler = picked ?? (await getScheduler(db))
  return db.transaction(
    'rw',
    [db.cards, db.reviewLogs, db.settings],
    async () => {
      const card = await db.cards.get(cardId)
      if (!card) throw new Error('Card not found')

      const isDue = await countsAsReview(db, card, now)
      const ready = isDue ? await readyFor(db, card, scheduler, settings) : card
      const next: ScheduleState = isDue
        ? scheduler.next(ready, rating, now, settings)
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

      const updated: Card = withSchedulerData(
        {
          ...card,
          due: next.due,
          intervalDays: next.intervalDays,
          step: next.step,
          lapses: next.lapses,
          reps: card.reps + 1,
          updatedAt: now,
        },
        next.schedulerData,
      )
      await db.cards.put(updated)
      return { card: updated, log }
    },
  )
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
  return withSchedulerData(
    {
      ...card,
      due: last.dueAfter,
      intervalDays: last.intervalAfter,
      step: last.stepAfter,
      reps: reviews.length,
      lapses: reviews.filter(
        (l) => l.rating === 'again' && l.intervalBefore > 0,
      ).length,
      updatedAt: Math.max(card.updatedAt, last.createdAt),
    },
    last.schedulerDataAfter,
  )
}

/** `card` with `schedulerData` set to `data`, or without it if none. */
function withSchedulerData(card: Card, data: JsonObject | undefined): Card {
  const rest = { ...card }
  delete rest.schedulerData
  return data ? { ...rest, schedulerData: data } : rest
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
