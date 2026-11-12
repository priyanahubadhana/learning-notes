import { describe, expect, it } from 'vitest'
import { foldRow, type FoldItem } from './rowFold'

const item = (id: string, full: number, short: number, priority: number) =>
  ({ id, full, short, priority }) satisfies FoldItem
const opts = { gap: 8, moreW: 44 }
const row = [
  item('a', 100, 44, 4),
  item('b', 100, 44, 3),
  item('c', 100, 44, 2),
  item('d', 100, 44, 1),
]

describe('foldRow', () => {
  it('keeps names while everything fits', () => {
    // 4 x 100 + 3 x 8 = 424
    const r = foldRow(row, 424, opts)
    expect(r).toEqual({
      names: true,
      shown: ['a', 'b', 'c', 'd'],
      folded: [],
    })
  })

  it('drops names before it folds anything', () => {
    // short: 4 x 44 + 24 = 200
    const r = foldRow(row, 300, opts)
    expect(r.names).toBe(false)
    expect(r.folded).toEqual([])
    expect(r.shown).toHaveLength(4)
  })

  it('folds the least important item last in the row first', () => {
    // 3 short items + "⋯" (30 wide) = 132 + 16 + 8 + 30 = 186; all four = 200
    const r = foldRow(row, 190, { gap: 8, moreW: 30 })
    expect(r.names).toBe(false)
    expect(r.folded).toEqual(['d'])
    expect(r.shown).toEqual(['a', 'b', 'c'])
  })

  it('keeps the original order of what stays and what folds', () => {
    const r = foldRow(row, 100, opts)
    expect(r.shown).toEqual(['a'])
    expect(r.folded).toEqual(['b', 'c', 'd'])
  })

  it('never folds an item with infinite priority', () => {
    const items = [item('x', 44, 44, Infinity), item('y', 44, 44, 1)]
    const r = foldRow(items, 10, opts)
    expect(r.shown).toEqual(['x'])
    expect(r.folded).toEqual(['y'])
  })

  it('between equal priorities the later one folds first', () => {
    const items = [item('p', 44, 44, 5), item('q', 44, 44, 5)]
    const r = foldRow(items, 90, { gap: 8, moreW: 30 })
    expect(r.folded).toEqual(['q'])
  })

  it('handles an empty row', () => {
    expect(foldRow([], 0, opts)).toEqual({
      names: true,
      shown: [],
      folded: [],
    })
  })

  it('is stable at the exact fit boundary', () => {
    expect(foldRow(row, 200, opts).folded).toEqual([])
    expect(foldRow(row, 199, opts).folded).toEqual(['c', 'd'])
  })
})
