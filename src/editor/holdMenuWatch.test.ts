import { describe, expect, it } from 'vitest'
import {
  distToRect,
  HOLD_PEN_PATH_PX,
  HOLD_PEN_STILL_PX,
  penMovedTooFar,
  penStepCounted,
  HOLD_STILL_PX,
  movedTooFar,
  PEN_CARET_PX,
  penPathTooLong,
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

describe('HOLD-MOVE: the Pencil rules (4 px radius, 1 px dead-band, 10 px path)', () => {
  it('(a) a Pencil may drift 4 px from its start, a finger 10 px', () => {
    expect(HOLD_PEN_STILL_PX).toBe(4)
    expect(penMovedTooFar(4, 0)).toBe(false)
    expect(penMovedTooFar(3, 3)).toBe(true)
    expect(movedTooFar(7, 7)).toBe(false) // a finger: 9.9 px
    // The 9 px loop of handwriting: 9 px from where it began is out for a Pencil.
    expect(penMovedTooFar(9, 0)).toBe(true)
  })
  it('(b) steps under 1 px are tremor and add nothing; the counted path ends the hold at 10 px', () => {
    expect(penStepCounted(0.8)).toBe(0)
    expect(penStepCounted(0.99)).toBe(0)
    expect(penStepCounted(1)).toBe(1)
    expect(penStepCounted(2.5)).toBe(2.5)
    // 1000 tremor steps never end a hold; 11 steps of 1 px do.
    let tremor = 0
    for (let i = 0; i < 1000; i++) tremor += penStepCounted(0.8)
    expect(penPathTooLong(tremor)).toBe(false)
    let path = 0
    for (let i = 0; i < 11; i++) path += penStepCounted(1)
    expect(penPathTooLong(path)).toBe(true)
    expect(penPathTooLong(10)).toBe(false)
    expect(HOLD_PEN_PATH_PX).toBe(10)
  })
})
