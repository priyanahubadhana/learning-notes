import { describe, expect, it } from 'vitest'
import type { GridRow } from '../../core/types'
import { narrow, stillFull, widen } from './boxFull'

const geo = { sheetW: 210, left: 15, right: 15 }
const grid = (): GridRow[] => [
  { id: 'r1', cols: [{ w: 1, boxIds: ['main'] }] },
  {
    id: 'r2',
    cols: [
      { w: 0.5, boxIds: ['a'] },
      { w: 0.5, boxIds: ['b'] },
    ],
  },
]

describe('Full width (TB-27)', () => {
  it('in a grid the box gets a row of its own that spans every column', () => {
    const r = widen(grid(), 'b', geo)!
    expect(r.rows.map((x) => x.cols.map((c) => c.boxIds))).toEqual([
      [['main']],
      [['a']],
      [['b']],
    ])
    expect(r.rows[1].cols[0].w).toBe(1)
    expect(r.rows[2].cols[0].w).toBe(1)
    expect(r.memo.beside).toBe('a')
  })
  it('turning it off returns the box to its column', () => {
    const on = widen(grid(), 'b', geo)!
    const off = narrow(on.rows, 'b', on.memo)
    expect(off.map((x) => x.cols.map((c) => c.boxIds))).toEqual([
      [['main']],
      [['a'], ['b']],
    ])
    expect(off[1].cols.map((c) => c.w)).toEqual([0.5, 0.5])
  })
  it('a free box takes the text width from the left margin and gets its place back', () => {
    const rows: GridRow[] = [
      { id: 'f', x: 40, wmm: 50, cols: [{ w: 1, boxIds: ['a'] }] },
    ]
    const on = widen(rows, 'a', geo)!
    expect(on.rows[0].x).toBe(15)
    expect(on.rows[0].wmm).toBe(180)
    const off = narrow(on.rows, 'a', on.memo)
    expect(off[0].x).toBe(40)
    expect(off[0].wmm).toBe(50)
  })
  it('a box that is not in the rows changes nothing', () => {
    expect(widen(grid(), 'zzz', geo)).toBeNull()
  })
  it('a box in a row of two columns is no longer full width', () => {
    expect(stillFull(grid(), 'a')).toBe(false)
    expect(stillFull(grid(), 'main')).toBe(true)
    const on = widen(grid(), 'b', geo)!
    expect(stillFull(on.rows, 'b')).toBe(true)
  })
})
