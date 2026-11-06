import { describe, expect, it } from 'vitest'
import {
  clampCrop,
  cropForRatio,
  dragCorner,
  isUnchanged,
  MIN_CROP,
  moveCrop,
  NO_EDIT,
  planEdit,
  rotatedSize,
} from './editImage'

describe('rotatedSize', () => {
  it('swaps the sides for quarter turns, exactly', () => {
    expect(rotatedSize(400, 300, 90)).toEqual({ w: 300, h: 400 })
    expect(rotatedSize(400, 300, 270)).toEqual({ w: 300, h: 400 })
    expect(rotatedSize(400, 300, 180)).toEqual({ w: 400, h: 300 })
    expect(rotatedSize(400, 300, 0)).toEqual({ w: 400, h: 300 })
  })
  it('grows the box for a free turn', () => {
    const b = rotatedSize(400, 300, 45)
    expect(b.w).toBeCloseTo((400 + 300) * Math.SQRT1_2, 5)
    expect(b.h).toBeCloseTo((400 + 300) * Math.SQRT1_2, 5)
  })
})

describe('crop maths', () => {
  it('clamps a crop inside the picture and above the minimum', () => {
    expect(clampCrop({ x: 0.9, y: -1, w: 0.5, h: 0 })).toEqual({
      x: 0.5,
      y: 0,
      w: 0.5,
      h: MIN_CROP,
    })
  })

  it('moves a corner and keeps the opposite one still', () => {
    const box = { w: 1000, h: 1000 }
    const c = dragCorner(NO_EDIT.crop, 'se', -0.5, -0.25, box, null)
    expect(c).toEqual({ x: 0, y: 0, w: 0.5, h: 0.75 })
    const d = dragCorner(NO_EDIT.crop, 'nw', 0.2, 0.3, box, null)
    expect(d.x).toBeCloseTo(0.2)
    expect(d.y).toBeCloseTo(0.3)
    expect(d.x + d.w).toBeCloseTo(1)
    expect(d.y + d.h).toBeCloseTo(1)
  })

  it('stops a corner at the picture edge and refuses a tiny crop', () => {
    const box = { w: 1000, h: 1000 }
    expect(dragCorner(NO_EDIT.crop, 'se', 5, 5, box, null)).toEqual(
      NO_EDIT.crop,
    )
    const half = { x: 0, y: 0, w: 0.5, h: 0.5 }
    expect(dragCorner(half, 'se', -0.49, 0, box, null)).toEqual(half)
  })

  it('keeps a fixed shape while dragging', () => {
    const box = { w: 1000, h: 500 }
    const c = dragCorner(NO_EDIT.crop, 'se', -0.4, -0.1, box, 1)
    expect((c.w * box.w) / (c.h * box.h)).toBeCloseTo(1, 5)
    expect(c.x).toBe(0)
    expect(c.y).toBe(0)
  })

  it('makes the biggest centred crop of a shape', () => {
    const c = cropForRatio(1, { w: 400, h: 200 })
    expect(c.h).toBe(1)
    expect(c.w).toBeCloseTo(0.5)
    expect(c.x).toBeCloseTo(0.25)
    const wide = cropForRatio(2, { w: 400, h: 400 })
    expect(wide.w).toBe(1)
    expect(wide.h).toBeCloseTo(0.5)
  })

  it('moves the whole crop but not out of the picture', () => {
    const c = moveCrop({ x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, 5, -5)
    expect(c).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 })
  })
})

describe('planEdit', () => {
  it('copies the crop from a quarter-turned picture', () => {
    const p = planEdit(800, 400, {
      angle: 90,
      crop: { x: 0, y: 0, w: 1, h: 0.5 },
    })
    expect(p.outW).toBe(400)
    expect(p.outH).toBe(400)
    expect(p.scale).toBe(1)
  })
  it('never passes the size limit and never enlarges', () => {
    const big = planEdit(8000, 4000, NO_EDIT)
    expect(Math.max(big.outW, big.outH)).toBe(4096)
    expect(big.scale).toBeCloseTo(0.512)
    const small = planEdit(100, 50, NO_EDIT)
    expect(small.outW).toBe(100)
    expect(small.scale).toBe(1)
  })
  it('knows an untouched edit', () => {
    expect(isUnchanged(NO_EDIT)).toBe(true)
    expect(isUnchanged({ angle: 360, crop: NO_EDIT.crop })).toBe(true)
    expect(isUnchanged({ angle: 90, crop: NO_EDIT.crop })).toBe(false)
  })
})
