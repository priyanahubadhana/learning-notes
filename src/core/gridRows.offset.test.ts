import { describe, expect, it } from 'vitest'
import { isGridRows } from './gridRows'

describe('stored rows with room (C13)', () => {
  const cols = (...w: number[]) =>
    w.map((x, i) => ({ w: x, boxIds: ['b' + i] }))
  it('accepts a row that leaves room at its right and one with a left offset', () => {
    expect(isGridRows([{ id: 'r', cols: cols(0.5, 0.3) }])).toBe(true)
    expect(isGridRows([{ id: 'r', x: 40, cols: cols(0.4, 0.4) }])).toBe(true)
  })
  it('still refuses a row wider than the page and a column row that is also "auto"', () => {
    expect(isGridRows([{ id: 'r', cols: cols(0.7, 0.6) }])).toBe(false)
    expect(isGridRows([{ id: 'r', auto: true, cols: cols(0.5, 0.5) }])).toBe(
      false,
    )
  })
})
