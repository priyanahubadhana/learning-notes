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

describe('foldRow with a stub (the favourites ★ n)', () => {
  const favs = { id: 'favs', full: 120, short: 120, priority: 1, stub: 44 }
  it('keeps the favourites with their names while the others lose theirs', () => {
    // a, b: 100 full / 44 short. Full = 100+100+120+16 = 336; short = 44+44+120+16 = 224.
    const r = foldRow(
      [item('a', 100, 44, 4), item('b', 100, 44, 3), favs],
      250,
      opts,
    )
    expect(r).toEqual({ names: false, shown: ['a', 'b', 'favs'], folded: [] })
  })
  it('folds only the favourites into their own stub, no ⋯ n', () => {
    // short 224 > 200; without favs: 44+44+8 + stub 44+8 = 148 fits.
    const r = foldRow(
      [item('a', 100, 44, 4), item('b', 100, 44, 3), favs],
      200,
      opts,
    )
    expect(r.shown).toEqual(['a', 'b'])
    expect(r.folded).toEqual(['favs'])
  })
  it('folds options into ⋯ n after the favourites are gone', () => {
    // a 44 + stub 52 + more 52 = 148 fits in 150; b must fold.
    const r = foldRow(
      [item('a', 100, 44, 4), item('b', 100, 60, 3), favs],
      150,
      opts,
    )
    expect(r.shown).toEqual(['a'])
    expect(r.folded).toEqual(['b', 'favs'])
  })
})
