import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import type { Block, Card } from '../core/types'
import { createTestDb } from '../core/testing'
import { CARD_BLOCK_TYPE, MAIN_PART, newCard } from './cardService'
import { countDue } from './reviewService'

/**
 * Polish 2, item 11: the Home tile and the sidebar badge count cards due by
 * the `due` index. 10,000 cards, 25 of them due, must stay quick.
 */

const NOW = new Date(2026, 10, 8, 12).getTime()
const DAY = 86_400_000
const base = { createdAt: NOW - 30 * DAY, updatedAt: NOW, deletedAt: null }

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(() => db.delete())

describe('the due count', () => {
  it('counts 25 due cards among 10,000 within the budget', async () => {
    const cards: Card[] = []
    const blocks: Block[] = []
    for (let i = 0; i < 10_000; i++) {
      const id = `b${i}`
      const due = i < 25 ? NOW - DAY : NOW + 5 * DAY
      cards.push({
        ...newCard({ id, pageId: 'p1' }, 'nb1', MAIN_PART, base.createdAt),
        id: `c${i}`,
        due,
        reps: 3,
        step: 2,
        intervalDays: 3,
      })
      if (i < 25) {
        blocks.push({
          ...base,
          id,
          pageId: 'p1',
          parentId: null,
          type: CARD_BLOCK_TYPE,
          content: { text: [{ type: 'text', text: 'Q?', styles: {} }] },
          order: `a${i}`,
        })
      }
    }
    await db.cards.bulkAdd(cards)
    await db.blocks.bulkAdd(blocks)
    const started = performance.now()
    const due = await countDue(db, NOW)
    const took = performance.now() - started
    expect(due).toBe(25)
    expect(took).toBeLessThan(1500)
  })
})
