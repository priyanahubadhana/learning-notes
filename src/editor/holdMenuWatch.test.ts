import { describe, expect, it } from 'vitest'
import {
  distToRect,
  HOLD_STILL_PX,
  movedTooFar,
  PEN_CARET_PX,
} from './holdMenuWatch'

describe('press-and-hold menu', () => {
  it('stays a hold within about 5 px and breaks beyond', () => {
    expect(movedTooFar(0, 0)).toBe(false)
    expect(movedTooFar(HOLD_STILL_PX, 0)).toBe(false)
    expect(movedTooFar(3, 3)).toBe(false)
    expect(movedTooFar(4, 4)).toBe(true)
  })
  it('measures how far a point is from the caret rectangle', () => {
    const caret = { left: 100, right: 101, top: 50, bottom: 70 }
    expect(distToRect(100, 60, caret)).toBe(0)
    expect(distToRect(110, 60, caret)).toBe(9)
    expect(distToRect(100, 90, caret)).toBe(20)
    expect(distToRect(110, 60, caret)).toBeLessThanOrEqual(PEN_CARET_PX)
    expect(distToRect(140, 60, caret)).toBeGreaterThan(PEN_CARET_PX)
  })
})
