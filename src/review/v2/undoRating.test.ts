import { beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import type { Block, Card, Rating } from '../../core/types'
import { setSetting } from '../../settings/settingsService'
import { newCardsPerDay, schedulerChoice } from '../../settings/builtinSettings'
import { CARD_BLOCK_TYPE, MAIN_PART, newCard } from '../../recall/cardService'
import {
  getReviewQueue,
  rateCard,
  rebuildCardFromLog,
  suspendCard,
  wrongCardIds,
} from '../../recall/reviewService'
import {
  afterRating,
  startSession,
  type ReviewSession,
} from '../../recall/reviewSession'
import {
  sameCard,
  undoInSession,
  undoRating,
  type LastAnswer,
} from './undoRating'

const NOW = new Date(2026, 9, 26, 12).getTime()
const DAY = 86_400_000
const base = { createdAt: NOW - 30 * DAY, updatedAt: NOW, deletedAt: null }
const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy']
let db: LearningNotesDB

const block = (id: string): Block => ({
  ...base,
  id,
  pageId: 'p1',
  parentId: null,
  type: CARD_BLOCK_TYPE,
  content: { text: [{ type: 'text', text: 'Question?', styles: {} }] },
  order: 'a0',
})

async function addCard(id: string, over: Partial<Card> = {}): Promise<Card> {
  await db.blocks.add(block(id))
  const card = {
    ...newCard({ id, pageId: 'p1' }, 'nb1', MAIN_PART, base.createdAt),
    id: `c-${id}`,
    ...over,
  }
  await db.cards.add(card)
  return card
}

/** A card that was learned before and is due now. */
const learned = (): Partial<Card> => ({
  due: NOW - DAY,
  reps: 3,
  step: 2,
  intervalDays: 3,
  lapses: 1,
})

/** Rates a card like the session does and returns what Undo needs. */
async function rate(cardId: string, rating: Rating): Promise<LastAnswer> {
  const before = (await db.cards.get(cardId))!
  const { card: after, log } = await rateCard(db, cardId, rating, {
    durationMs: 4000,
    now: NOW,
  })
  return { before, after, logId: log.id, rating }
}

const SCHEDULE = [
  'due',
  'intervalDays',
  'step',
  'reps',
  'lapses',
  'schedulerData',
  'lastReviewAt',
  'lastRating',
  'suspendedAt',
] as const

beforeEach(async () => {
  db = createTestDb()
  await db.notebooks.add({
    ...base,
    id: 'nb1',
    workspaceId: 'w',
    title: 'N',
    order: 'a0',
  })
  await db.pages.add({
    ...base,
    id: 'p1',
    notebookId: 'nb1',
    parentId: null,
    title: 'P',
    order: 'a0',
  })
})

describe.each(['fsrs', 'fixed'])('undoRating (%s scheduler)', (choice) => {
  beforeEach(async () => {
    await setSetting(db, schedulerChoice, choice as never)
  })

  it.each(RATINGS)(
    'rate %s then undo puts back the exact previous schedule',
    async (rating) => {
      await addCard('a', learned())
      const last = await rate('c-a', rating)
      expect(sameCard((await db.cards.get('c-a'))!, last.after)).toBe(true)
      expect(last.after.reps).toBe(last.before.reps + 1)

      expect(await undoRating(db, last, NOW + 1000)).toBe('ok')

      const restored = (await db.cards.get('c-a'))!
      for (const field of SCHEDULE) {
        expect(restored[field], field).toEqual(last.before[field])
      }
      // The whole record is the old one; only the edit time moved forward (sync).
      expect({ ...restored, updatedAt: 0 }).toEqual({
        ...last.before,
        updatedAt: 0,
      })
      expect(restored.updatedAt).toBeGreaterThanOrEqual(last.before.updatedAt)
    },
  )

  it('rating writes exactly one log row and one card update', async () => {
    await addCard('a', learned())
    const last = await rate('c-a', 'good')
    const logs = await db.reviewLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0].id).toBe(last.logId)
    expect((await db.cards.get('c-a'))!.reps).toBe(4)
  })

  it('keeps the log row, marks it, and the card is back in the queue and counts', async () => {
    await addCard('a', learned())
    const last = await rate('c-a', 'good')
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).cards).toHaveLength(
      0,
    )

    await undoRating(db, last, NOW + 1000)

    const logs = await db.reviewLogs.toArray()
    expect(logs).toHaveLength(1) // never deleted
    expect(logs[0].purgedAt).toBe(NOW + 1000)
    const queue = await getReviewQueue(db, { kind: 'all' }, NOW)
    expect(queue.cards.map((c) => c.id)).toEqual(['c-a'])
    expect(queue.reviewCount).toBe(1)
  })

  it('refuses when the card changed since the rating, and changes nothing', async () => {
    await addCard('a', learned())
    const last = await rate('c-a', 'good')
    await suspendCard(db, 'c-a', NOW + 5)
    const changed = (await db.cards.get('c-a'))!

    expect(await undoRating(db, last)).toBe('changed')

    expect(await db.cards.get('c-a')).toEqual(changed)
    expect((await db.reviewLogs.toArray())[0].purgedAt).toBeUndefined()
  })

  it('refuses when the card is gone', async () => {
    await addCard('a', learned())
    const last = await rate('c-a', 'easy')
    await db.cards.delete('c-a')
    expect(await undoRating(db, last)).toBe('changed')
  })

  it("a new card: undo gives its place in today's new-card limit back", async () => {
    await setSetting(db, newCardsPerDay, 1)
    await addCard('a')
    await addCard('b', {
      createdAt: base.createdAt + 1,
      due: base.createdAt + 1,
    })
    const first = (await getReviewQueue(db, { kind: 'all' }, NOW)).cards
    expect(first).toHaveLength(1)
    const last = await rate(first[0].id, 'good')
    // The limit of 1 is used up: nothing new is offered.
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).newCount).toBe(0)

    await undoRating(db, last, NOW + 10)

    const after = await getReviewQueue(db, { kind: 'all' }, NOW)
    expect(after.newCount).toBe(1)
    expect(after.cards.map((c) => c.id)).toEqual([first[0].id])
  })

  it('a rebuild from the log ignores the undone rating', async () => {
    await addCard('a', learned())
    const first = await rate('c-a', 'easy')
    // The card has one log row for a card with history 3 reps: rebuild replays only logs.
    await undoRating(db, first, NOW + 1)
    const rebuilt = await rebuildCardFromLog(db, 'c-a')
    expect(rebuilt.reps).toBe(0) // no counted review rows remain
    expect(rebuilt.lastReviewAt).toBeUndefined()
  })

  it('"got wrong" ignores an undone Again', async () => {
    await addCard('a', learned())
    const last = await rate('c-a', 'again')
    expect((await wrongCardIds(db, NOW)).has('c-a')).toBe(true)
    await undoRating(db, last, NOW + 1)
    expect((await wrongCardIds(db, NOW)).has('c-a')).toBe(false)
  })

  it('reload in the middle: the queue read from the database holds exactly the unrated cards', async () => {
    await addCard('a', learned())
    await addCard('b', { ...learned(), due: NOW - DAY + 1 })
    await addCard('c', { ...learned(), due: NOW - DAY + 2 })
    const queue = (await getReviewQueue(db, { kind: 'all' }, NOW)).cards
    expect(queue.map((c) => c.id)).toEqual(['c-a', 'c-b', 'c-c'])

    const last = await rate(queue[0].id, 'good') // "reload" after this one
    const reloaded = (await getReviewQueue(db, { kind: 'all' }, NOW)).cards
    expect(reloaded.map((c) => c.id)).toEqual(['c-b', 'c-c'])
    expect(startSession(reloaded).queue).toHaveLength(2)

    await undoRating(db, last, NOW + 1)
    const again = (await getReviewQueue(db, { kind: 'all' }, NOW)).cards
    expect(again.map((c) => c.id)).toEqual(['c-a', 'c-b', 'c-c'])
  })
})

describe('undoInSession', () => {
  const card = (id: string, over: Partial<Card> = {}): Card => ({
    ...newCard({ id, pageId: 'p1' }, 'nb1', MAIN_PART, 0),
    id,
    ...over,
  })

  it('puts the card back first and counts one less answered (Good)', () => {
    const [a, b, c] = [card('a'), card('b'), card('c')]
    const start = startSession([a, b, c])
    const rated = { ...a, reps: 1 }
    const s = afterRating(start, 'good', rated, true) // a done, 2 left
    const back = undoInSession(s, a, rated)
    expect(back.queue.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(back.queue[0]).toBe(a)
    expect(back.done).toBe(0)
  })

  it('takes the card out of the waiting list (Again)', () => {
    const [a, b] = [card('a'), card('b')]
    const rated = { ...a, due: 1000, intervalDays: 0 }
    const s = afterRating(startSession([a, b]), 'again', rated, true)
    expect(s.waiting).toHaveLength(1)
    const back = undoInSession(s, a, rated)
    expect(back.waiting).toHaveLength(0)
    expect(back.queue.map((x) => x.id)).toEqual(['a', 'b'])
    expect(back.done).toBe(0)
  })

  it('takes a practised Again card out of the queue where it was put later', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => card(id))
    const rated = { ...cards[0], lastRating: 'again' as const }
    const s = afterRating(startSession(cards), 'again', rated, false)
    expect(s.queue.map((x) => x.id)).toEqual(['b', 'c', 'd', 'a', 'e'])
    const back: ReviewSession = undoInSession(s, cards[0], rated)
    expect(back.queue.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('never goes below zero answered', () => {
    const a = card('a')
    const back = undoInSession({ queue: [], waiting: [], done: 0 }, a, a)
    expect(back.done).toBe(0)
    expect(back.queue).toEqual([a])
  })
})

describe('sameCard', () => {
  it('ignores key order and missing against undefined fields', () => {
    const a = newCard({ id: 'x', pageId: 'p1' }, 'nb1', MAIN_PART, 0)
    const reordered = Object.fromEntries(Object.entries(a).reverse()) as Card
    expect(sameCard(a, reordered)).toBe(true)
    expect(sameCard(a, { ...a, lastRating: undefined })).toBe(true)
    expect(sameCard(a, { ...a, reps: 1 })).toBe(false)
  })
})
