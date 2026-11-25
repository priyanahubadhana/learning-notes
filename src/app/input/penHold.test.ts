import { describe, expect, it } from 'vitest'
import {
  PEN_HOLD_MS,
  HoldPath,
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

describe('HoldPath (a loop is not a hold)', () => {
  it('a wobble with a path of 20 px still holds', () => {
    const h = new HoldPath(100, 100)
    expect(h.add(110, 100)).toBe(false)
    expect(h.add(105, 100)).toBe(false)
    expect(h.add(100, 104)).toBe(false)
    expect(h.add(102, 100)).toBe(false)
  })
  it('breaks beyond 18 px from the first touch', () => {
    const h = new HoldPath(0, 0)
    expect(h.add(19, 0)).toBe(true)
    expect(h.add(0, 0)).toBe(true) // stays broken
  })
  it('a 15 px radius loop taking 1.8 s is not a hold', () => {
    const h = new HoldPath(85, 100)
    let broke = false
    for (let i = 1; i <= 108; i++) {
      const a = Math.PI + (i / 108) * Math.PI * 2
      if (h.add(100 + Math.cos(a) * 15, 100 + Math.sin(a) * 15)) broke = true
    }
    expect(broke).toBe(true)
  })
  it('a tiny loop inside 3 mm (the "vi" circle) is not a hold either', () => {
    const h = new HoldPath(94, 100)
    let broke = false
    for (let i = 1; i <= 108; i++) {
      const a = Math.PI + (i / 108) * Math.PI * 2
      if (h.add(100 + Math.cos(a) * 6, 100 + Math.sin(a) * 6)) broke = true
    }
    expect(broke).toBe(true)
  })
})
