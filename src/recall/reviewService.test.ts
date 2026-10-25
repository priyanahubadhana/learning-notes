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
  reviewsPerDay,
} from '../settings/builtinSettings'
import { setSetting } from '../settings/settingsService'
import {
  createPageFromTemplate,
  ensureTemplates,
  listTemplates,
} from '../templates/templateService'
import { CARD_BLOCK_TYPE, MAIN_PART, newCard } from './cardService'
import {
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
  content: { text: [] },
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

  it('filters by notebook, page and missed in the last 7 days', async () => {
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
    await addCard('today', learned(NOW - 60_000)) // due today: not "missed"
    await addCard('new', { due: NOW - 2 * DAY })

    const nb = await getReviewQueue(
      db,
      { kind: 'notebook', notebookId: 'nb1' },
      NOW,
    )
    expect(ids(nb.cards).sort()).toEqual(['c-a', 'c-b', 'c-new', 'c-today'])
    const page = await getReviewQueue(db, { kind: 'page', pageId: 'p2' }, NOW)
    expect(ids(page.cards)).toEqual(['c-b'])
    const missed = await getReviewQueue(db, { kind: 'missed' }, NOW)
    expect(ids(missed.cards).sort()).toEqual(['c-a', 'c-c'])
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

  it('a card that is not due is logged as cram and left unchanged', async () => {
    const before = await addCard('a', learned(NOW + 2 * DAY))
    const { card, log } = await rateCard(db, 'c-a', 'again', {
      durationMs: 10,
      now: NOW,
    })
    expect(card).toEqual(before)
    expect(await db.cards.get('c-a')).toEqual(before)
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
    expect(await getPracticeCards(db, { kind: 'missed' })).toEqual([])
  })

  it('a practised Again card keeps its schedule', async () => {
    const before = await addCard('a', learned(NOW + 5 * DAY))
    await rateCard(db, 'c-a', 'again', { durationMs: 1, now: NOW })
    expect(await db.cards.get('c-a')).toEqual(before)
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
