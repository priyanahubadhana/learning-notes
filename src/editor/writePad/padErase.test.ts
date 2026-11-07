import { describe, expect, it } from 'vitest'
import { erasePadStrokes } from './padErase'
import type { PadStroke } from './pressure'

const line: PadStroke = Array.from({ length: 21 }, (_, i) => ({
  x: i * 5,
  y: 50,
  p: 0.5,
}))

describe('erasePadStrokes', () => {
  it('returns the same strokes when nothing is touched', () => {
    const strokes = [line]
    expect(
      erasePadStrokes(strokes, { x: 50, y: 0 }, { x: 60, y: 0 }, 4, 'precise'),
    ).toBe(strokes)
  })
  it('precise cuts the touched part and keeps both sides', () => {
    const out = erasePadStrokes(
      [line],
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      6,
      'precise',
    )
    expect(out).toHaveLength(2)
    expect(out[0][out[0].length - 1].x).toBeLessThan(50)
    expect(out[1][0].x).toBeGreaterThan(50)
  })
  it('stroke mode removes the whole stroke', () => {
    expect(
      erasePadStrokes([line], { x: 50, y: 52 }, { x: 50, y: 52 }, 6, 'stroke'),
    ).toEqual([])
  })
  it('standard drops tiny leftovers', () => {
    const out = erasePadStrokes(
      [line.slice(0, 4)],
      { x: 15, y: 50 },
      { x: 15, y: 50 },
      6,
      'standard',
    )
    expect(out).toEqual([])
  })
})
