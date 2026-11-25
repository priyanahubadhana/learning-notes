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
  it('a comma-sized wobble with a path of 15 px still holds', () => {
    const h = new HoldPath(100, 100)
    expect(h.add(106, 100)).toBe(false)
    expect(h.add(103, 100)).toBe(false)
    expect(h.add(103, 104)).toBe(false)
    expect(h.add(101, 104)).toBe(false)
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

describe('HoldPath with a real Pencil (jitter, slow loop, drift)', () => {
  // A small seeded random number generator, so the test is the same every time.
  const rng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  it('240 points of +-0.8 px jitter around the touch do not break the hold', () => {
    const r = rng(7)
    const h = new HoldPath(300, 300)
    let broke = false
    for (let i = 0; i < 240; i++)
      if (h.add(300 + (r() - 0.5) * 1.6, 300 + (r() - 0.5) * 1.6)) broke = true
    expect(broke).toBe(false)
  })
  it('the slow small loop round "vi" (about 23 px of path by 0.8 s) breaks it', () => {
    const h = new HoldPath(100, 100)
    let broke = false
    // 108 points round 8.5 x 13 px (the "vi" loop, about 68 px round); 0.8 s is about 40 of them.
    for (let i = 1; i <= 40; i++) {
      const a = Math.PI + (i / 108) * Math.PI * 2
      if (h.add(108.5 + Math.cos(a) * 8.5, 100 + Math.sin(a) * 13)) broke = true
    }
    expect(broke).toBe(true)
  })
  it('a straight drift of 19 px breaks it', () => {
    const h = new HoldPath(0, 0)
    let broke = false
    for (let i = 1; i <= 19; i++) if (h.add(i, 0)) broke = true
    expect(broke).toBe(true)
  })
})
