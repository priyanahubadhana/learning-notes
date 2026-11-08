import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block, Card, Deck, Page } from '../core/types'
import { newCardsPerDay } from '../settings/builtinSettings'
import { setSetting } from '../settings/settingsService'
import { CARD_BLOCK_TYPE, MAIN_PART, newCard } from './cardService'
import { createDeck, deckCards, deleteDeck, listDecks } from './deckService'
import {
  listPaused,
  pauseItem,
  pausedIds,
  pausedPageIds,
  resumeItem,
} from './pauseService'
import { getReviewQueue, scopeCounts } from './reviewService'

const NOW = new Date(2026, 9, 26, 12).getTime()
const DAY = 86_400_000
const base = { createdAt: NOW - 30 * DAY, updatedAt: NOW, deletedAt: null }
let db: LearningNotesDB

const page = (id: string, notebookId: string, parentId: string | null = null) =>
  ({
    ...base,
    id,
    notebookId,
    parentId,
    title: id,
    order: 'a0',
  }) as Page

const block = (id: string, pageId: string): Block => ({
  ...base,
  id,
  pageId,
  parentId: null,
  type: CARD_BLOCK_TYPE,
  content: { text: [{ type: 'text', text: 'Q?', styles: {} }] },
  order: 'a0',
})

async function addCard(
  id: string,
  pageId: string,
  notebookId: string,
  over: Partial<Card> = {},
) {
  await db.blocks.add(block(id, pageId))
  await db.cards.add({
    ...newCard({ id, pageId }, notebookId, MAIN_PART, base.createdAt),
    id: `c-${id}`,
    ...over,
  })
}
const learned: Partial<Card> = {
  due: NOW - DAY,
  reps: 3,
  step: 2,
  intervalDays: 3,
}
const learning: Partial<Card> = {
  due: NOW - 1000,
  reps: 1,
  step: 1,
  intervalDays: 0,
}

beforeEach(async () => {
  db = createTestDb()
  for (const id of ['nb1', 'nb2']) {
    await db.notebooks.add({
      ...base,
      id,
      workspaceId: 'w',
      title: id,
      order: id === 'nb1' ? 'a0' : 'a1',
    })
  }
  await db.pages.bulkAdd([
    page('p1', 'nb1'),
    page('p1a', 'nb1', 'p1'),
    page('p1b', 'nb1', 'p1a'),
    page('p2', 'nb1'),
    page('q1', 'nb2'),
  ])
  await addCard('a', 'p1', 'nb1') // new
  await addCard('b', 'p1a', 'nb1', learned)
  await addCard('c', 'p1b', 'nb1', learning)
  await addCard('d', 'p2', 'nb1')
  await addCard('e', 'q1', 'nb2', learned)
})
afterEach(async () => {
  await db.delete()
})

const ids = (cards: Card[]) => cards.map((c) => c.id).sort()

describe('deck cards', () => {
  it('no place means every card', async () => {
    const deck = await createDeck(db, { name: 'All' })
    expect(await deckCards(db, deck, NOW)).toHaveLength(5)
  })

  it('a notebook reviews everything in it', async () => {
    const deck = await createDeck(db, {
      name: 'N2',
      scope: { notebookIds: ['nb2'], pageIds: [], withSubpages: true },
    })
    expect(ids(await deckCards(db, deck, NOW))).toEqual(['c-e'])
  })

  it('a page with its sub-pages, or without', async () => {
    const withSub = await createDeck(db, {
      name: 'P1',
      scope: { notebookIds: [], pageIds: ['p1'], withSubpages: true },
    })
    expect(ids(await deckCards(db, withSub, NOW))).toEqual([
      'c-a',
      'c-b',
      'c-c',
    ])
    const alone = await createDeck(db, {
      name: 'P1 alone',
      scope: { notebookIds: [], pageIds: ['p1'], withSubpages: false },
    })
    expect(ids(await deckCards(db, alone, NOW))).toEqual(['c-a'])
  })

  it('tags: any and all, own page tags count', async () => {
    await db.tags.bulkAdd([
      { ...base, id: 't1', name: 'bio', parentId: null },
      { ...base, id: 't2', name: 'chem', parentId: null },
    ] as never)
    await db.pages.update('p2', { tagIds: ['t1'] })
    await db.blockTags.bulkAdd([
      { id: 'a|t1', blockId: 'a', pageId: 'p1', tagId: 't1' },
      { id: 'a|t2', blockId: 'a', pageId: 'p1', tagId: 't2' },
      { id: 'b|t2', blockId: 'b', pageId: 'p1a', tagId: 't2' },
    ])
    const any = await createDeck(db, {
      name: 'any',
      tagIds: ['t1', 't2'],
      tagMode: 'any',
    })
    expect(ids(await deckCards(db, any, NOW))).toEqual(['c-a', 'c-b', 'c-d'])
    const all = await createDeck(db, {
      name: 'all',
      tagIds: ['t1', 't2'],
      tagMode: 'all',
    })
    expect(ids(await deckCards(db, all, NOW))).toEqual(['c-a'])
  })

  it('states: new, learning, due', async () => {
    const pick = async (states: Deck['states']) =>
      ids(await deckCards(db, await createDeck(db, { name: 's', states }), NOW))
    expect(await pick(['new'])).toEqual(['c-a', 'c-d'])
    expect(await pick(['learning'])).toEqual(['c-c'])
    expect(await pick(['due'])).toEqual(['c-b', 'c-e'])
    expect(await pick(['new', 'learning'])).toEqual(['c-a', 'c-c', 'c-d'])
  })

  it('decks are live: a new card joins by itself; delete keeps the notes', async () => {
    const deck = await createDeck(db, {
      name: 'N2',
      scope: { notebookIds: ['nb2'], pageIds: [], withSubpages: true },
    })
    await addCard('f', 'q1', 'nb2')
    expect(await deckCards(db, deck, NOW)).toHaveLength(2)
    await deleteDeck(db, deck.id)
    expect(await listDecks(db)).toEqual([])
    expect(await db.cards.count()).toBe(6)
  })
})

describe('review queue of a deck and counts', () => {
  it('a deck scope studies only its cards, counts agree', async () => {
    const deck = await createDeck(db, {
      name: 'N1',
      scope: { notebookIds: ['nb1'], pageIds: [], withSubpages: true },
    })
    const queue = await getReviewQueue(
      db,
      { kind: 'deck', deckId: deck.id },
      NOW,
    )
    expect(queue.cards).toHaveLength(4)
    expect(
      await scopeCounts(db, { kind: 'deck', deckId: deck.id }, NOW),
    ).toEqual({ new: 2, learning: 1, due: 1 })
    expect(await scopeCounts(db, { kind: 'all' }, NOW)).toEqual({
      new: 2,
      learning: 1,
      due: 2,
    })
  })

  it('a missing deck is empty', async () => {
    const queue = await getReviewQueue(db, { kind: 'deck', deckId: 'zz' }, NOW)
    expect(queue.cards).toEqual([])
  })
})

describe('pause', () => {
  it('a paused notebook leaves reviews; resume brings it back', async () => {
    await pauseItem(db, 'notebook', 'nb2')
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).cards).toHaveLength(
      4,
    )
    expect((await db.notebooks.get('nb2'))?.paused).toBe(true)
    expect(await listPaused(db)).toEqual([
      { kind: 'notebook', id: 'nb2', title: 'nb2' },
    ])
    await resumeItem(db, 'notebook', 'nb2')
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).cards).toHaveLength(
      5,
    )
    expect((await db.notebooks.get('nb2'))?.paused).toBeUndefined()
    expect(await pausedIds(db)).toEqual(new Set())
  })

  it('a paused page also pauses its sub-pages, at any depth', async () => {
    await pauseItem(db, 'page', 'p1')
    const queue = await getReviewQueue(db, { kind: 'all' }, NOW)
    expect(ids(queue.cards)).toEqual(['c-d', 'c-e'])
    expect(
      await pausedPageIds(db, ['p1', 'p1a', 'p1b', 'p2'], await pausedIds(db)),
    ).toEqual(new Set(['p1', 'p1a', 'p1b']))
  })

  it('a paused page is out of a deck too', async () => {
    const deck = await createDeck(db, { name: 'All' })
    await pauseItem(db, 'page', 'p2')
    const queue = await getReviewQueue(
      db,
      { kind: 'deck', deckId: deck.id },
      NOW,
    )
    expect(queue.cards).toHaveLength(4)
  })
})

describe('database upgrade 15 to 16', () => {
  it('adds the decks table and keeps every row', async () => {
    const name = `v15-${Math.random()}`
    const old = new Dexie(name)
    old.version(15).stores({ notebooks: 'id, workspaceId', fonts: 'id' })
    await old
      .table('notebooks')
      .add({ id: 'n1', title: 'Old', workspaceId: 'w' })
    old.close()
    const d = new LearningNotesDB(name)
    await d.open()
    try {
      expect(d.verno).toBeGreaterThanOrEqual(16)
      expect((await d.notebooks.get('n1'))?.title).toBe('Old')
      expect(await d.decks.count()).toBe(0)
    } finally {
      d.close()
      await Dexie.delete(name)
    }
  })
})

describe('speed', () => {
  it('counts 10,000 cards in in good time (median under 600 ms)', async () => {
    const blocks: Block[] = []
    const cards: Card[] = []
    for (let i = 0; i < 10_000; i++) {
      blocks.push(block(`x${i}`, 'p2'))
      cards.push({
        ...newCard({ id: `x${i}`, pageId: 'p2' }, 'nb1', MAIN_PART, NOW - 5000),
        id: `cx${i}`,
        ...(i % 2 ? learned : {}),
      })
    }
    await db.blocks.bulkAdd(blocks)
    await db.cards.bulkAdd(cards)
    await setSetting(db, newCardsPerDay, 1000)
    // Warm-up run so CI's first-call JIT cost is not counted.
    await scopeCounts(db, { kind: 'all' }, NOW)
    // Median of five: one slow CI tick cannot fail it, but a real slowdown
    // (every run slower) still does. 300 ms on a dev machine; 600 ms allows
    // for a shared CI runner, still far below a per-card scan (seconds).
    const times: number[] = []
    for (let i = 0; i < 5; i++) {
      const started = performance.now()
      await scopeCounts(db, { kind: 'all' }, NOW)
      times.push(performance.now() - started)
    }
    times.sort((a, b) => a - b)
    expect(times[2]).toBeLessThan(600)
  })
})

describe('Walk the route (E2)', () => {
  it('a deck with routeOrder reviews cards in page and block order', async () => {
    await db.pages.bulkAdd([
      { ...page('r1', 'nb1'), order: 'b1' },
      { ...page('r2', 'nb1'), order: 'b2' },
    ])
    const add = async (
      id: string,
      pageId: string,
      order: string,
      due: number,
    ) => {
      await addCard(id, pageId, 'nb1', { ...learned, due })
      await db.blocks.update(id, { order })
    }
    await add('r2a', 'r2', 'a0', NOW - 5 * DAY)
    await add('r1b', 'r1', 'a1', NOW - 4 * DAY)
    await add('r1a', 'r1', 'a0', NOW - 3 * DAY)
    const scope = {
      notebookIds: [],
      pageIds: ['r1', 'r2'],
      withSubpages: false,
    }
    const plain = await createDeck(db, { name: 'Plain', scope })
    const route = await createDeck(db, {
      name: 'Route',
      scope,
      routeOrder: true,
    })
    const order = async (deckId: string) =>
      (await getReviewQueue(db, { kind: 'deck', deckId }, NOW)).cards.map(
        (c) => c.id,
      )
    expect(await order(plain.id)).toEqual(['c-r2a', 'c-r1b', 'c-r1a'])
    expect(await order(route.id)).toEqual(['c-r1a', 'c-r1b', 'c-r2a'])
  })
})
