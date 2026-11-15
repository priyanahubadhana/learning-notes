import { describe, expect, it } from 'vitest'
import {
  ETA_AFTER_MS,
  SLOW_BPS,
  SLOW_FOR_MS,
  STEPS,
  createSpeedMeter,
  etaStep,
} from './updateSpeed'

const KB = 1000
/** Feeds `bps` bytes per second, one sample a second, for `sec` seconds. */
function feed(
  m: ReturnType<typeof createSpeedMeter>,
  from: number,
  sec: number,
  bps: number,
  total: number,
  loaded0 = 0,
) {
  let r = m.add(from, loaded0, total)
  for (let i = 1; i <= sec; i++)
    r = m.add(from + i * 1000, loaded0 + i * bps, total)
  return r
}

describe('etaStep (T1: rounded up, in steps)', () => {
  it('rounds up to the next step', () => {
    expect(etaStep(0.2)).toBe(5)
    expect(etaStep(5)).toBe(5)
    expect(etaStep(6)).toBe(10)
    expect(etaStep(31)).toBe(45)
    expect(etaStep(61)).toBe(120)
    expect(etaStep(110)).toBe(120)
  })
})

describe('time left', () => {
  it('is unknown for the first 3 seconds (Working out the time)', () => {
    const m = createSpeedMeter()
    const r = feed(m, 0, 2, 100 * KB, 10_000 * KB)
    expect(r.etaS).toBeUndefined()
    expect(ETA_AFTER_MS).toBe(3000)
  })
  it('shows a rounded-up step from the speed of the last 5 seconds', () => {
    const m = createSpeedMeter()
    const r = feed(m, 0, 4, 100 * KB, 1000 * KB)
    // 600 KB left at 100 KB/s = 6 s -> 10
    expect(r.etaS).toBe(10)
  })
  it('uses only the last 5 seconds: a fast start does not hide a slow now', () => {
    const m = createSpeedMeter()
    feed(m, 0, 5, 1000 * KB, 100_000 * KB)
    const r = feed(m, 5000, 6, 10 * KB, 100_000 * KB, 5000 * KB)
    // 95 MB left at 10 KB/s is far more than 10 s
    expect(r.etaS).toBeGreaterThan(600)
  })
  it('never moves more than one step per second', () => {
    const m = createSpeedMeter()
    feed(m, 0, 4, 100 * KB, 1000 * KB) // 10
    // the speed collapses: the shown value follows, one step at a time
    const shown: number[] = [10]
    for (let i = 1; i <= 12; i++) {
      const r = m.add(4000 + i * 1000, 400 * KB + i * KB, 1000 * KB)
      if (r.etaS !== undefined) shown.push(r.etaS)
    }
    const idx = shown.map((v) => STEPS.indexOf(v))
    for (let i = 1; i < idx.length; i++)
      expect(Math.abs(idx[i] - idx[i - 1])).toBeLessThanOrEqual(1)
    expect(shown[shown.length - 1]).toBeGreaterThan(10)
  })
  it('has no number when nothing arrives (stalled)', () => {
    const m = createSpeedMeter()
    const r = feed(m, 0, 6, 0, 1000 * KB)
    expect(r.etaS).toBeUndefined()
  })
})

describe('slow note (T2/T3)', () => {
  it('needs 8 seconds in a row under the limit', () => {
    const m = createSpeedMeter()
    expect(SLOW_BPS).toBe(50 * KB)
    expect(SLOW_FOR_MS).toBe(8000)
    const early = feed(m, 0, 6, 20 * KB, 100_000 * KB)
    expect(early.slow).toBe(false)
    const later = m.add(10_000, 200 * KB, 100_000 * KB)
    expect(later.slow).toBe(true)
    expect(later.bps).toBeLessThan(SLOW_BPS)
  })
  it('goes away by itself when the speed is back', () => {
    const m = createSpeedMeter()
    feed(m, 0, 10, 20 * KB, 100_000 * KB)
    const r = feed(m, 10_000, 6, 500 * KB, 100_000 * KB, 200 * KB)
    expect(r.slow).toBe(false)
  })
  it('a fast connection is never called slow', () => {
    const m = createSpeedMeter()
    expect(feed(m, 0, 20, 400 * KB, 100_000 * KB).slow).toBe(false)
  })
  it('a stalled download (the same bytes again) becomes slow after 8 s', () => {
    const m = createSpeedMeter()
    expect(feed(m, 0, 10, 0, 1000 * KB).slow).toBe(true)
  })
})
