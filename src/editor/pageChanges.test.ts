import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../core/testing'
import { watchPageChanges } from './pageChanges'

describe('watchPageChanges', () => {
  it('fires when a block of the page is saved, not for other pages', async () => {
    const db = createTestDb()
    await db.open()
    const spy = vi.fn()
    const stop = watchPageChanges(db, 'p1', spy)
    await new Promise((r) => setTimeout(r, 50))
    const base = { type: 'paragraph', content: [], updatedAt: 1 }
    await db.blocks.put({ id: 'b0', pageId: 'p2', ...base } as never)
    await new Promise((r) => setTimeout(r, 100))
    expect(spy).not.toHaveBeenCalled()
    await db.blocks.put({ id: 'b1', pageId: 'p1', ...base } as never)
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    stop()
    await db.blocks.put({ id: 'b2', pageId: 'p1', ...base } as never)
    await new Promise((r) => setTimeout(r, 100))
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
