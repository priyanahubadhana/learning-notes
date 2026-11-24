import { describe, expect, it } from 'vitest'
import {
  PEN_HOLD_MS,
  PEN_HOLD_SLOP_PX,
  PEN_QUIET_MS,
  noteWritten,
  wroteRecently,
  holdMsFor,
  holdSlopFor,
} from './penHold'

describe('the Pencil hold (owner, 25 Nov 2026)', () => {
  it('is 0.8 s and about 3 mm (18 px)', () => {
    expect(PEN_HOLD_MS).toBe(800)
    expect(PEN_HOLD_SLOP_PX).toBe(18)
  })
  it('changes the Pencil only: finger and mouse keep their numbers', () => {
    expect(holdMsFor('pen', 500)).toBe(800)
    expect(holdMsFor('touch', 500)).toBe(500)
    expect(holdMsFor('mouse', 600)).toBe(600)
    expect(holdSlopFor('pen', 12)).toBe(18)
    expect(holdSlopFor('touch', 12)).toBe(12)
    expect(holdSlopFor('mouse', 10)).toBe(10)
  })
})

describe('quiet after writing', () => {
  it('is on for 1 s after text went in, then off', () => {
    expect(PEN_QUIET_MS).toBe(1000)
    noteWritten(10_000)
    expect(wroteRecently(10_999)).toBe(true)
    expect(wroteRecently(11_000)).toBe(false)
  })
})
