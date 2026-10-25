import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block } from '../core/types'
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

  it('keeps the record when a card turns back into text', async () => {
    await db.blocks.add(block('c1', CARD_BLOCK_TYPE))
    await syncCardRecords(db, 'p1', T)
    await db.blocks.update('c1', { type: 'paragraph' })
    await syncCardRecords(db, 'p1', T)
    expect(await db.cards.count()).toBe(1)
  })
})
