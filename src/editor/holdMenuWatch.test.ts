import { describe, expect, it } from 'vitest'
import {
  distToRect,
  HOLD_STILL_PX,
  movedTooFar,
  PEN_CARET_PX,
  PEN_QUIET_MS,
} from './holdMenuWatch'

describe('press-and-hold menu', () => {
  it('C0-7: stays a hold within about 10 px and breaks beyond', () => {
    expect(HOLD_STILL_PX).toBe(10)
    expect(movedTooFar(0, 0)).toBe(false)
    expect(movedTooFar(HOLD_STILL_PX, 0)).toBe(false)
    expect(movedTooFar(7, 7)).toBe(false)
    expect(movedTooFar(8, 8)).toBe(true)
  })
  it('C0-7: the Pencil is quiet for 1 s after writing', () => {
    expect(PEN_QUIET_MS).toBe(1000)
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
