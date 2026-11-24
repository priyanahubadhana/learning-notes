import { describe, expect, it } from 'vitest'
import type { GridRow } from '../../core/types'
import { applyShape, isOwnLayouts, shapeOf } from './ownLayouts'

const page = (): GridRow[] => [
  { id: 'r0', cols: [{ w: 1, boxIds: ['main'] }] },
  {
    id: 'r1',
    cols: [
      { w: 0.5, boxIds: ['a'] },
      { w: 0.5, boxIds: ['b', 'c'] },
    ],
  },
  { id: 'r2', cols: [{ w: 1, boxIds: ['d'] }] },
]

describe('own layouts (TB-28)', () => {
  it('saves the shape of a page without its own text box', () => {
    const s = shapeOf(page())!
    expect(s.rows).toEqual([
      {
        cols: [
          { w: 0.5, stack: 1 },
          { w: 0.5, stack: 2 },
        ],
      },
      { cols: [{ w: 1, stack: 1 }] },
    ])
    expect(isOwnLayouts([{ id: 'x', name: 'Mine', ...s }])).toBe(true)
  })
  it('a page with no other box has no shape', () => {
    expect(
      shapeOf([{ id: 'r', cols: [{ w: 1, boxIds: ['main'] }] }]),
    ).toBeNull()
  })
  it('applies a shape to other boxes in reading order; extra boxes get a row each', () => {
    const s = shapeOf(page())!
    const other: GridRow[] = [
      { id: 'q0', cols: [{ w: 1, boxIds: ['main'] }] },
      { id: 'q1', cols: [{ w: 1, boxIds: ['p'] }] },
      { id: 'q2', cols: [{ w: 1, boxIds: ['q'] }] },
      { id: 'q3', cols: [{ w: 1, boxIds: ['r'] }] },
      { id: 'q4', cols: [{ w: 1, boxIds: ['s'] }] },
      { id: 'q5', cols: [{ w: 1, boxIds: ['t'] }] },
    ]
    const out = applyShape(other, s)!
    expect(out.map((r) => r.cols.map((c) => c.boxIds))).toEqual([
      [['main']],
      [['p'], ['q', 'r']],
      [['s']],
      [['t']],
    ])
  })
  it('rejects a broken list', () => {
    expect(isOwnLayouts([{ id: 1 }])).toBe(false)
  })
})
