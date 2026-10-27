import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { addStudyDays } from '../core/time'
import type { Block, Card, JsonObject } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createBlock } from '../core/blockService'
import { createNotebook } from '../notebooks/notebookService'
import {
  againMinutes,
  goodSteps,
  newCardsPerDay,
  practiceOrder,
  reviewsPerDay,
  schedulerChoice,
  targetMemory,
} from '../settings/builtinSettings'
import { setSetting } from '../settings/settingsService'
import {
  createPageFromTemplate,
  ensureTemplates,
  listTemplates,
} from '../templates/templateService'
import { CARD_BLOCK_TYPE, MAIN_PART, newCard } from './cardService'
import {
  countsAsReview,
  getCardFace,
  getPracticeCards,
  getReviewQueue,
  previewCard,
  rateCard,
  rebuildCard,
  rebuildCardFromLog,
  suspendCard,
  unsuspendCard,
} from './reviewService'

const NOW = new Date(2026, 9, 26, 12).getTime()
const DAY = 86_400_000
const base = { createdAt: NOW - 30 * DAY, updatedAt: NOW, deletedAt: null }
let db: LearningNotesDB

const blankContent = (id: string): JsonObject => ({
  text: [{ type: 'text', text: 'x', styles: { blank: id } }],
})

const block = (
  id: string,
  pageId = 'p1',
  over: Partial<Block> = {},
): Block => ({
  ...base,
  id,
  pageId,
  parentId: null,
  type: CARD_BLOCK_TYPE,
  content: { text: [{ type: 'text', text: 'Question?', styles: {} }] },
  order: 'a0',
  ...over,
})

/** Adds a live Card block plus its card record. */
async function addCard(
  id: string,
  over: Partial<Card> = {},
  pageId = 'p1',
  notebookId = 'nb1',
): Promise<Card> {
  await db.blocks.add(block(id, pageId))
  const card = {
    ...newCard({ id, pageId }, notebookId, MAIN_PART, base.createdAt),
    id: `c-${id}`,
    ...over,
  }
  await db.cards.add(card)
  return card
}

const learned = (due: number): Partial<Card> => ({
  due,
  reps: 3,
  step: 2,
  intervalDays: 3,
})

const ids = (cards: Card[]) => cards.map((c) => c.id)

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
  await db.pages.add({
    ...base,
    id: 'p2',
    notebookId: 'nb1',
    parentId: null,
    title: 'Q',
    order: 'a1',
  })
})

afterEach(async () => {
  await db.delete()
})

describe('review queue', () => {
  it('lists due reviews (most overdue first) then new cards', async () => {
    await addCard('new1', { due: NOW - DAY })
    await addCard('r1', learned(NOW - DAY))
    await addCard('r2', learned(NOW - 3 * DAY))
    await addCard('later', learned(NOW + DAY))
    const q = await getReviewQueue(db, { kind: 'all' }, NOW)
    expect(ids(q.cards)).toEqual(['c-r2', 'c-r1', 'c-new1'])
    expect(q).toMatchObject({ reviewCount: 2, newCount: 1 })
  })

  it('skips suspended cards, deleted blocks and blocks that stopped being cards', async () => {
    await addCard('ok')
    await addCard('sus', { suspendedAt: NOW })
    await addCard('del')
    await db.blocks.update('del', { deletedAt: NOW })
    await addCard('para')
    await db.blocks.update('para', { type: 'paragraph' })
    // A blank card whose blank was removed from the text.
    await db.blocks.add(
      block('bl', 'p1', { type: 'paragraph', content: blankContent('k1') }),
    )
    await db.cards.add({
      ...newCard({ id: 'bl', pageId: 'p1' }, 'nb1', 'k1', 0),
      id: 'c-k1',
    })
    await db.cards.add({
      ...newCard({ id: 'bl', pageId: 'p1' }, 'nb1', 'gone', 0),
      id: 'c-gone',
    })
    const q = await getReviewQueue(db, { kind: 'all' }, NOW)
    expect(ids(q.cards).sort()).toEqual(['c-k1', 'c-ok'])
  })

  it('filters by notebook and page', async () => {
    await db.notebooks.add({
      ...base,
      id: 'nb2',
      workspaceId: 'w',
      title: 'M',
      order: 'a1',
    })
    await db.pages.add({
      ...base,
      id: 'p3',
      notebookId: 'nb2',
      parentId: null,
      title: 'R',
      order: 'a0',
    })
    await addCard('a', learned(NOW - DAY))
    await addCard('b', learned(NOW - 10 * DAY), 'p2')
    await addCard('c', learned(NOW - DAY), 'p3', 'nb2')
    await addCard('today', learned(NOW - 60_000))
    await addCard('new', { due: NOW - 2 * DAY })

    const nb = await getReviewQueue(
      db,
      { kind: 'notebook', notebookId: 'nb1' },
      NOW,
    )
    expect(ids(nb.cards).sort()).toEqual(['c-a', 'c-b', 'c-new', 'c-today'])
    const page = await getReviewQueue(db, { kind: 'page', pageId: 'p2' }, NOW)
    expect(ids(page.cards)).toEqual(['c-b'])
  })

  it('"Got wrong" lists cards rated Again in the last 7 days', async () => {
    await addCard('recent', learned(NOW - DAY))
    await addCard('old', learned(NOW - 20 * DAY))
    await addCard('fine', learned(NOW - DAY))
    await rateCard(db, 'c-recent', 'again', {
      durationMs: 1,
      now: NOW - 2 * DAY,
    })
    await rateCard(db, 'c-old', 'again', { durationMs: 1, now: NOW - 10 * DAY })
    await rateCard(db, 'c-fine', 'good', { durationMs: 1, now: NOW - 2 * DAY })
    const wrong = await getReviewQueue(db, { kind: 'wrong' }, NOW)
    expect(ids(wrong.cards)).toEqual(['c-recent'])
    expect(await getPracticeCards(db, { kind: 'wrong' })).toEqual([])
  })

  it('applies the new-card limit and review cap, counting what was done today', async () => {
    await setSetting(db, newCardsPerDay, 2)
    await setSetting(db, reviewsPerDay, 1)
    for (const id of ['n1', 'n2', 'n3']) await addCard(id)
    await addCard('r1', learned(NOW - DAY))
    await addCard('r2', learned(NOW - DAY))
    let q = await getReviewQueue(db, { kind: 'all' }, NOW)
    expect(q).toMatchObject({ newCount: 2, reviewCount: 1 })

    await rateCard(db, 'c-n1', 'good', { durationMs: 1000, now: NOW })
    q = await getReviewQueue(db, { kind: 'all' }, NOW + 1)
    expect(q.newCount).toBe(1)
    // Yesterday's reviews do not count toward today's limits.
    q = await getReviewQueue(db, { kind: 'all' }, NOW + DAY)
    expect(q.newCount).toBe(2)
  })

  it('excludes cards in the Templates notebook', async () => {
    await db.notebooks.add({
      ...base,
      id: 'tpl',
      workspaceId: 'w',
      title: 'T',
      order: 'a2',
      kind: 'templates',
    })
    await db.pages.add({
      ...base,
      id: 'pt',
      notebookId: 'tpl',
      parentId: null,
      title: 'T',
      order: 'a0',
    })
    await addCard('t', {}, 'pt', 'tpl')
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).cards).toEqual([])
  })
})

describe('rating', () => {
  // These check the Simple steps rules; FSRS has its own tests below.
  beforeEach(async () => {
    await setSetting(db, schedulerChoice, 'fixed')
  })

  it('reschedules a due card and writes one log entry', async () => {
    await addCard('a', learned(NOW - DAY))
    const { card, log } = await rateCard(db, 'c-a', 'good', {
      durationMs: 4200,
      now: NOW,
    })
    expect(card).toMatchObject({
      step: 3,
      intervalDays: 7,
      reps: 4,
      due: addStudyDays(NOW, 7),
    })
    expect(await db.cards.get('c-a')).toEqual(card)
    expect(log).toMatchObject({
      kind: 'review',
      rating: 'good',
      scheduler: 'fixed',
      durationMs: 4200,
      dueBefore: NOW - DAY,
      dueAfter: card.due,
      intervalBefore: 3,
      intervalAfter: 7,
      stepAfter: 3,
      isNew: false,
    })
    expect(await db.reviewLogs.count()).toBe(1)
  })

  it('a card that is not due is logged as cram, schedule unchanged', async () => {
    const before = await addCard('a', learned(NOW + 2 * DAY))
    const { card, log } = await rateCard(db, 'c-a', 'again', {
      durationMs: 10,
      now: NOW,
    })
    // Only the latest answer is noted.
    const answered = { ...before, lastReviewAt: NOW, lastRating: 'again' }
    expect(card).toEqual(answered)
    expect(await db.cards.get('c-a')).toEqual(answered)
    expect(log).toMatchObject({
      kind: 'cram',
      dueAfter: before.due,
      isNew: false,
    })
  })

  it('previews use the current settings', async () => {
    const c = await addCard('a', learned(NOW))
    expect((await previewCard(db, c, NOW)).good.intervalDays).toBe(7)
    await setSetting(db, goodSteps, [2, 5, 9])
    await setSetting(db, againMinutes, 3)
    const p = await previewCard(db, c, NOW)
    expect(p.good.intervalDays).toBe(9)
    expect(p.again.due).toBe(NOW + 3 * 60_000)
  })

  it('card state can be rebuilt from the log', async () => {
    const original = await addCard('a', { due: NOW })
    let t = NOW
    for (const r of ['good', 'good', 'again', 'hard', 'easy'] as const) {
      const { card } = await rateCard(db, 'c-a', r, { durationMs: 1, now: t })
      t = card.due
    }
    await rateCard(db, 'c-a', 'good', { durationMs: 1, now: t - DAY }) // cram
    const stored = (await db.cards.get('c-a'))!
    expect(stored.lapses).toBe(1)
    expect(stored).toMatchObject({ lastReviewAt: t - DAY, lastRating: 'good' })

    const logs = await db.reviewLogs.where('cardId').equals('c-a').toArray()
    expect(rebuildCard(original, logs)).toEqual(stored)
    await db.cards.put({ ...stored, due: 0, step: 9, reps: 0 }) // damage it
    expect(await rebuildCardFromLog(db, 'c-a')).toEqual(stored)
  })
})

describe('suspend', () => {
  it('suspended cards leave the queue and come back when unsuspended', async () => {
    await addCard('a')
    await suspendCard(db, 'c-a', NOW)
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).cards).toEqual([])
    await unsuspendCard(db, 'c-a', NOW)
    expect(ids((await getReviewQueue(db, { kind: 'all' }, NOW)).cards)).toEqual(
      ['c-a'],
    )
  })
})

describe('pages from templates', () => {
  it('get card records for copied Card blocks', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    await ensureTemplates(db, ws)
    const tpl = (await listTemplates(db, ws))[0]
    await createBlock(db, { pageId: tpl.id, type: CARD_BLOCK_TYPE })
    const nb = await createNotebook(db, ws, 'Study')
    const page = await createPageFromTemplate(db, nb.id, null, tpl.id)
    const cards = await db.cards.where('pageId').equals(page.id).toArray()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ notebookId: nb.id, part: MAIN_PART })
  })
})

describe('practice anyway', () => {
  it('lists active cards in the scope, soonest due first, up to the limit', async () => {
    await addCard('far', learned(NOW + 9 * DAY))
    await addCard('near', learned(NOW + DAY))
    await addCard('other', learned(NOW + 2 * DAY), 'p2')
    await addCard('sus', { ...learned(NOW), suspendedAt: NOW })
    const page = await getPracticeCards(db, { kind: 'page', pageId: 'p1' })
    expect(ids(page)).toEqual(['c-near', 'c-far'])
    const all = await getPracticeCards(db, { kind: 'all' }, 2)
    expect(ids(all)).toEqual(['c-near', 'c-other'])
  })

  it('Shuffle setting: the same round in random order', async () => {
    await addCard('far', learned(NOW + 9 * DAY))
    await addCard('near', learned(NOW + DAY))
    await setSetting(db, practiceOrder, 'shuffle')
    const scope = { kind: 'page', pageId: 'p1' } as const
    const cards = await getPracticeCards(db, scope, undefined, () => 0)
    expect(ids(cards)).toEqual(['c-far', 'c-near'])
  })

  it('new cards past the daily limit are practice: they stay new', async () => {
    await setSetting(db, newCardsPerDay, 1)
    await addCard('n1')
    await addCard('n2')
    expect(await countsAsReview(db, (await db.cards.get('c-n1'))!, NOW)).toBe(
      true,
    )
    await rateCard(db, 'c-n1', 'good', { durationMs: 1, now: NOW })
    const n2 = (await db.cards.get('c-n2'))!
    expect(await countsAsReview(db, n2, NOW + 1)).toBe(false)
    const { log } = await rateCard(db, 'c-n2', 'good', {
      durationMs: 1,
      now: NOW + 1,
    })
    expect(log.kind).toBe('cram')
    expect(await db.cards.get('c-n2')).toMatchObject({ ...n2, reps: 0 })
    // Next study day it counts again.
    expect(await countsAsReview(db, n2, NOW + DAY)).toBe(true)
  })

  it('a practised Again card keeps its schedule', async () => {
    const before = await addCard('a', learned(NOW + 5 * DAY))
    await rateCard(db, 'c-a', 'again', { durationMs: 1, now: NOW })
    expect(await db.cards.get('c-a')).toEqual({
      ...before,
      lastReviewAt: NOW,
      lastRating: 'again',
    })
  })
})

describe('card face', () => {
  it('a Card block shows its children as the answer', async () => {
    const card = await addCard('q')
    await db.blocks.update('q', {
      content: { text: [{ type: 'text', text: 'Q?', styles: {} }] },
    })
    await db.blocks.add(block('a1', 'p1', { parentId: 'q', order: 'a0' }))
    await db.blocks.add(block('a2', 'p1', { parentId: 'a1', order: 'a0' }))
    const face = await getCardFace(db, card)
    expect(face).toMatchObject({ kind: 'card', pageTitle: 'P' })
    expect(face?.answer.map((b) => [b.id, b.depth])).toEqual([
      ['a1', 0],
      ['a2', 1],
    ])
  })

  it('a blank shows its block text with the blank id', async () => {
    await db.blocks.add(
      block('bl', 'p1', { type: 'paragraph', content: blankContent('k1') }),
    )
    const card = newCard({ id: 'bl', pageId: 'p1' }, 'nb1', 'k1', 0)
    const face = await getCardFace(db, card)
    expect(face).toMatchObject({ kind: 'blank', blankId: 'k1', answer: [] })
    await db.blocks.update('bl', { deletedAt: NOW })
    expect(await getCardFace(db, card)).toBeNull()
  })
})

describe('speed', () => {
  it('builds the queue for 10,000 cards quickly', async () => {
    const N = 10_000
    const blocks: Block[] = []
    const cards: Card[] = []
    for (let i = 0; i < N; i++) {
      const id = `b${i}`
      blocks.push(block(id))
      cards.push({
        ...newCard({ id, pageId: 'p1' }, 'nb1', MAIN_PART, 0),
        id: `c${i}`,
        // Half due (some learned), half in the future.
        ...(i % 2 === 0 ? learned(NOW - (i % 50) * DAY) : learned(NOW + DAY)),
        ...(i % 10 === 0 && { reps: 0 }),
      })
    }
    await db.blocks.bulkAdd(blocks)
    await db.cards.bulkAdd(cards)

    const start = performance.now()
    const q = await getReviewQueue(db, { kind: 'all' }, NOW)
    const ms = performance.now() - start
    expect(q.reviewCount).toBe(4000)
    expect(q.newCount).toBe(20) // default new-card limit
    // fake-indexeddb is far slower than a real browser; this is a ceiling.
    expect(ms).toBeLessThan(3000)
  }, 30_000)
})

describe('empty cards and sub-page scope', () => {
  it('a Card with no question is left out until one is typed', async () => {
    await addCard('full')
    await addCard('empty')
    await db.blocks.update('empty', { content: { text: [] } })
    const scope = { kind: 'page', pageId: 'p1' } as const
    expect(ids((await getReviewQueue(db, scope, NOW)).cards)).toEqual([
      'c-full',
    ])
    expect(ids(await getPracticeCards(db, scope))).toEqual(['c-full'])

    await db.blocks.update('empty', {
      content: { text: [{ type: 'text', text: 'Now?', styles: {} }] },
    })
    expect((await getReviewQueue(db, scope, NOW)).cards).toHaveLength(2)
  })

  it('page scope includes sub-pages only when asked', async () => {
    await db.pages.add({
      ...base,
      id: 'p-sub',
      notebookId: 'nb1',
      parentId: 'p1',
      title: 'Sub',
      order: 'a1',
    })
    await addCard('top')
    await addCard('sub', {}, 'p-sub')
    const queue = (includeSubpages: boolean) =>
      getReviewQueue(db, { kind: 'page', pageId: 'p1', includeSubpages }, NOW)
    expect(ids((await queue(false)).cards)).toEqual(['c-top'])
    expect(ids((await queue(true)).cards).sort()).toEqual(['c-sub', 'c-top'])
  })
})

describe('FSRS (the default scheduler)', () => {
  const MIN = 60_000
  const rate = (rating: 'again' | 'hard' | 'good' | 'easy', now: number) =>
    rateCard(db, 'c-a', rating, { durationMs: 1, now })

  it('a new card repeats after "Again" minutes, then moves to day gaps', async () => {
    await addCard('a', { due: NOW })
    const first = await rate('good', NOW)
    expect(first.card.due).toBe(NOW + 10 * MIN)
    expect(first.card.intervalDays).toBe(0)
    expect(first.log).toMatchObject({ scheduler: 'fsrs', isNew: true })
    expect(first.log.schedulerDataAfter).toMatchObject({ scheduler: 'fsrs' })

    const second = await rate('good', first.card.due)
    expect(second.card.intervalDays).toBeGreaterThanOrEqual(1)
    expect(second.card.due).toBe(
      addStudyDays(first.card.due, second.card.intervalDays),
    )
    expect(second.log.isNew).toBe(false)
  })

  it('Again on a learned card comes back after "Again" minutes and counts a lapse', async () => {
    await addCard('a', { due: NOW })
    let t = NOW
    for (const r of ['good', 'good'] as const) t = (await rate(r, t)).card.due
    const { card } = await rate('again', t)
    expect(card.due).toBe(t + 10 * MIN)
    expect(card.lapses).toBe(1)
  })

  it('a higher target memory gives shorter gaps', async () => {
    await addCard('a', { due: NOW })
    let t = NOW
    for (const r of ['good', 'good'] as const) t = (await rate(r, t)).card.due
    const c = (await db.cards.get('c-a'))!
    const at = async (target: number) => {
      await setSetting(db, targetMemory, target)
      return (await previewCard(db, c, t)).good.intervalDays
    }
    expect(await at(95)).toBeLessThan(await at(80))
  })

  it('switching takes over cards from their history without moving them', async () => {
    await setSetting(db, schedulerChoice, 'fixed')
    await addCard('a', { due: NOW })
    let t = NOW
    for (const r of ['good', 'good', 'good'] as const)
      t = (await rate(r, t)).card.due
    const fixed = (await db.cards.get('c-a'))!
    expect(fixed.schedulerData).toBeUndefined()

    // Switching itself changes nothing stored.
    await setSetting(db, schedulerChoice, 'fsrs')
    expect(await db.cards.get('c-a')).toEqual(fixed)
    const preview = await previewCard(db, fixed, t)
    expect(preview.good.intervalDays).toBeGreaterThan(1)

    const { card, log } = await rate('good', t)
    expect(log.scheduler).toBe('fsrs')
    expect(card.schedulerData).toMatchObject({ scheduler: 'fsrs', state: 2 })
    expect(card.reps).toBe(4)

    // And back: the ladder step is worked out from the current gap.
    await setSetting(db, schedulerChoice, 'fixed')
    const back = await rate('good', card.due)
    expect(back.card.schedulerData).toBeUndefined()
    expect(back.log.scheduler).toBe('fixed')
    expect(back.card.intervalDays).toBeGreaterThanOrEqual(card.intervalDays)
  })

  it('card state can be rebuilt from the log', async () => {
    const original = await addCard('a', { due: NOW })
    let t = NOW
    for (const r of ['good', 'good', 'again', 'hard', 'easy'] as const)
      t = (await rate(r, t)).card.due
    const stored = (await db.cards.get('c-a'))!
    const logs = await db.reviewLogs.where('cardId').equals('c-a').toArray()
    expect(rebuildCard(original, logs)).toEqual(stored)
  })
})

describe('FSRS with damaged stored data', () => {
  it('still schedules the card (as a fresh start) instead of breaking', async () => {
    await addCard('a', {
      due: NOW,
      schedulerData: { scheduler: 'fsrs', stability: 'oops' },
    })
    const { card } = await rateCard(db, 'c-a', 'good', {
      durationMs: 1,
      now: NOW,
    })
    expect(Number.isFinite(card.due)).toBe(true)
    expect(card.schedulerData).toMatchObject({ scheduler: 'fsrs' })
    expect(Number.isFinite(card.schedulerData?.stability)).toBe(true)
  })
})
