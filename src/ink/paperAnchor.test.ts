import { describe, expect, it } from 'vitest'
import {
  drawingAnchor,
  frameOf,
  nextBlockAt,
  reanchorPts,
  toWorld,
  type BlockRect,
} from './anchor'

const blocks: BlockRect[] = [
  { id: 'a', x: 0, y: 0, w: 500, h: 30 },
  { id: 'b', x: 0, y: 30, w: 500, h: 30 },
  { id: 'c', x: 0, y: 60, w: 500, h: 30 },
]

describe('paper ink rules (Phase Q)', () => {
  it('re-anchoring keeps every point where it is on screen', () => {
    const from = frameOf(blocks[2], 500)
    const to = frameOf(blocks[0], 500)
    const pts = [0.1, 0.02, 0.5, 0, 0, 0, 0.2, 0.05, 0.5, 0, 0, 5]
    const moved = reanchorPts(pts, 6, from, to)
    for (let i = 0; i < pts.length; i += 6) {
      const a = toWorld({ x: pts[i], y: pts[i + 1] }, from)
      const b = toWorld({ x: moved[i], y: moved[i + 1] }, to)
      expect(b.x).toBeCloseTo(a.x, 1)
      expect(b.y).toBeCloseTo(a.y, 1)
      expect(moved[i + 2]).toBe(pts[i + 2]) // pressure and the rest kept
    }
  })

  it('a deleted line hands its ink to the next line', () => {
    // "b" (y 30) was deleted; "c" moved up into its place.
    const after: BlockRect[] = [blocks[0], { ...blocks[2], y: 30 }]
    expect(nextBlockAt(30, after)?.id).toBe('c')
    expect(nextBlockAt(200, after)).toBeUndefined()
  })

  it('a drawing over several lines belongs to its top line', () => {
    expect(drawingAnchor({ x: 10, y: 35 }, [], blocks)).toBe('b')
    // It touches a stroke that belongs to line "a": the whole drawing is "a".
    expect(drawingAnchor({ x: 10, y: 35 }, ['a'], blocks)).toBe('a')
    expect(drawingAnchor({ x: 10, y: 65 }, ['c', null], blocks)).toBe('c')
  })
})
