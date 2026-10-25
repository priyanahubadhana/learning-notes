import { describe, expect, it } from 'vitest'
import { createId } from './ids'
import { assignOrders, byOrder, orderAtIndex, orderBetween } from './order'
import { descendantIds, newRecordFields } from './records'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('createId', () => {
  it('returns unique UUID v4 strings', () => {
    const ids = new Set(Array.from({ length: 1000 }, createId))
    expect(ids.size).toBe(1000)
    for (const id of ids) expect(id).toMatch(UUID_V4)
  })
})

describe('newRecordFields', () => {
  it('creates a live record with a UUID and matching timestamps', () => {
    const r = newRecordFields()
    expect(r.id).toMatch(UUID_V4)
    expect(r.deletedAt).toBeNull()
    expect(r.updatedAt).toBe(r.createdAt)
  })
})

describe('fractional ordering', () => {
  it('creates keys that sort between neighbours', () => {
    const first = orderBetween(null, null)
    const last = orderBetween(first, null)
    const middle = orderBetween(first, last)
    const items = [last, middle, first].map((order) => ({ order }))
    expect(items.sort(byOrder).map((i) => i.order)).toEqual([
      first,
      middle,
      last,
    ])
  })

  it('keeps working after many inserts at the same spot', () => {
    let low = orderBetween(null, null)
    const high = orderBetween(low, null)
    for (let i = 0; i < 200; i++) {
      const next = orderBetween(low, high)
      expect(low < next && next < high).toBe(true)
      low = next
    }
  })

  it('orderAtIndex places items at start, middle and (clamped) end', () => {
    const a = orderBetween(null, null)
    const b = orderBetween(a, null)
    expect(orderAtIndex([a, b], 0) < a).toBe(true)
    const mid = orderAtIndex([a, b], 1)
    expect(a < mid && mid < b).toBe(true)
    expect(orderAtIndex([a, b], 99) > b).toBe(true)
    expect(typeof orderAtIndex([], 0)).toBe('string')
  })
})

describe('assignOrders', () => {
  const isIncreasing = (keys: string[]) =>
    keys.every((k, i) => i === 0 || keys[i - 1] < k)

  it('gives new items increasing keys', () => {
    const keys = assignOrders([null, null, null])
    expect(isIncreasing(keys)).toBe(true)
  })

  it('keeps all keys when nothing moved', () => {
    const existing = assignOrders([null, null, null])
    expect(assignOrders(existing)).toEqual(existing)
  })

  it('re-keys only the moved item', () => {
    const [a, b, c, d] = assignOrders([null, null, null, null])
    const result = assignOrders([d, a, b, c]) // d moved to the front
    expect(result.slice(1)).toEqual([a, b, c])
    expect(isIncreasing(result)).toBe(true)
  })

  it('inserts new items between kept neighbours', () => {
    const [a, b] = assignOrders([null, null])
    const result = assignOrders([a, null, null, b])
    expect(result[0]).toBe(a)
    expect(result[3]).toBe(b)
    expect(isIncreasing(result)).toBe(true)
  })

  it('fixes duplicate keys', () => {
    const [a] = assignOrders([null])
    expect(isIncreasing(assignOrders([a, a, a]))).toBe(true)
  })
})

describe('descendantIds', () => {
  it('finds all nested children but not unrelated items', () => {
    const items = [
      { id: 'root', parentId: null },
      { id: 'c1', parentId: 'root' },
      { id: 'c2', parentId: 'root' },
      { id: 'g1', parentId: 'c1' },
      { id: 'other', parentId: null },
    ]
    expect(descendantIds(items, 'root').sort()).toEqual(['c1', 'c2', 'g1'])
    expect(descendantIds(items, 'g1')).toEqual([])
  })
})
