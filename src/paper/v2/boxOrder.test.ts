import { describe, expect, it } from 'vitest'
import type { GridRow } from '../../core/types'
import { neighbourOf, swapBoxes } from './boxOrder'

const rows: GridRow[] = [
  { id: 'r0', cols: [{ w: 1, boxIds: ['main'] }] },
  {
    id: 'r1',
    cols: [
      { w: 0.4, boxIds: ['a'] },
      { w: 0.6, boxIds: ['b', 'c'] },
    ],
  },
  { id: 'r2', cols: [{ w: 1, boxIds: ['d'] }] },
]

describe('boxOrder (TB-19: Move up / Move down)', () => {
  it('the neighbour is the next box in reading order', () => {
    expect(neighbourOf(rows, 'a', 'down')).toBe('b')
    expect(neighbourOf(rows, 'c', 'down')).toBe('d')
    expect(neighbourOf(rows, 'd', 'up')).toBe('c')
  })
  it('the page text box never takes part and the ends have no neighbour', () => {
    expect(neighbourOf(rows, 'a', 'up')).toBeNull()
    expect(neighbourOf(rows, 'd', 'down')).toBeNull()
    expect(neighbourOf(rows, 'main', 'down')).toBeNull()
    expect(neighbourOf(rows, 'zzz', 'down')).toBeNull()
  })
  it('a swap puts each box in the other cell and keeps the cell sizes', () => {
    const out = swapBoxes(rows, 'a', 'b')
    expect(out[1].cols.map((c) => c.boxIds)).toEqual([['b'], ['a', 'c']])
    expect(out[1].cols.map((c) => c.w)).toEqual([0.4, 0.6])
    expect(rows[1].cols[0].boxIds).toEqual(['a'])
  })
})
