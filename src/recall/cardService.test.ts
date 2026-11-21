import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block, JsonObject } from '../core/types'
import { CARD_BLOCK_TYPE, syncCardRecords } from './cardService'

const T = 1_700_000_000_000
const base = { createdAt: T, updatedAt: T, deletedAt: null }
let db: LearningNotesDB

const block = (
  id: string,
  type: string,
  deletedAt: number | null = null,
): Block => ({
  ...base,
  id,
  pageId: 'p1',
  parentId: null,
  type,
  content: { text: [] },
  order: 'a0',
  deletedAt,
})

beforeEach(async () => {
  db = createTestDb()
  await db.pages.add({
    ...base,
    id: 'p1',
    notebookId: 'nb1',
    parentId: null,
    title: 'P',
    order: 'a0',
  })
})

afterEach(async () => {
  await db.delete()
})

describe('syncCardRecords', () => {
  it('creates one due card per live Card block', async () => {
    await db.blocks.bulkAdd([
      block('c1', CARD_BLOCK_TYPE),
      block('c2', CARD_BLOCK_TYPE, T), // deleted
      block('x', 'paragraph'),
    ])
    await syncCardRecords(db, 'p1', T)
    const cards = await db.cards.toArray()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      blockId: 'c1',
      part: 'main',
      pageId: 'p1',
      notebookId: 'nb1',
      due: T,
      step: 0,
      reps: 0,
      suspendedAt: null,
    })
  })

  it('is safe to call repeatedly and keeps existing schedules', async () => {
    await db.blocks.add(block('c1', CARD_BLOCK_TYPE))
    await syncCardRecords(db, 'p1', T)
    const [card] = await db.cards.toArray()
    await db.cards.update(card.id, { step: 3 })
    await syncCardRecords(db, 'p1', T + 1000)
    const cards = await db.cards.toArray()
    expect(cards).toHaveLength(1)
    expect(cards[0].step).toBe(3)
  })

  it('creates one card per blank, plus the Card itself', async () => {
    const run = (text: string, blank?: string): JsonObject => ({
      type: 'text',
      text,
      styles: blank ? { blank } : {},
    })
    await db.blocks.add({
      ...block('c1', CARD_BLOCK_TYPE),
      content: {
        text: [
          run('S2: '),
          run('aortic', 'b1'),
          run(' + '),
          run('pulmonary', 'b2'),
        ],
      },
    })
    await syncCardRecords(db, 'p1', T)
    const parts = (await db.cards.toArray()).map((c) => c.part).sort()
    expect(parts).toEqual(['b1', 'b2', 'main'])
  })

  // P1 speed (17 Nov 2026): this runs every time a page or box opens. A write
  // transaction waits for all others (seconds for a page of boxes on iPad
  // Safari), so with nothing to add it must only read.
  it('opens no write transaction when every card already exists', async () => {
    await db.blocks.add(block('c1', CARD_BLOCK_TYPE))
    await syncCardRecords(db, 'p1', T)
    const modes: string[] = []
    const real = db.transaction.bind(db) as (...a: unknown[]) => unknown
    ;(
      db as unknown as { transaction: (...a: unknown[]) => unknown }
    ).transaction = (...args: unknown[]) => {
      modes.push(String(args[0]))
      return real(...args)
    }
    await syncCardRecords(db, 'p1', T + 1000)
    await db.blocks.add({ ...block('c2', CARD_BLOCK_TYPE), order: 'a1' })
    await syncCardRecords(db, 'p1', T + 2000)
    expect(modes).toEqual(['r', 'r', 'rw'])
    expect(await db.cards.count()).toBe(2)
  })

  it('keeps the record when a card turns back into text', async () => {
    await db.blocks.add(block('c1', CARD_BLOCK_TYPE))
    await syncCardRecords(db, 'p1', T)
    await db.blocks.update('c1', { type: 'paragraph' })
    await syncCardRecords(db, 'p1', T)
    expect(await db.cards.count()).toBe(1)
  })
})
