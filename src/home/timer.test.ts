import { describe, expect, it } from 'vitest'
import {
  clampCycle,
  clock,
  DEFAULT_CYCLE,
  elapsedMs,
  focusMsWithin,
  fromCycleList,
  hoursLabel,
  MIN,
  phaseAt,
  toCycleList,
} from './timer'

describe('timer maths', () => {
  it('measures from the start, so a long sleep loses nothing', () => {
    const start = Date.UTC(2026, 10, 7, 8)
    // The device slept for 3 hours between two looks.
    expect(elapsedMs(start, start + 3 * 60 * MIN)).toBe(3 * 60 * MIN)
    // A clock set back never shows negative time.
    expect(elapsedMs(start, start - 5000)).toBe(0)
  })

  it('walks the Pomodoro cycle: 25/5, long break 15 after every 4', () => {
    const at = (min: number) => phaseAt(min * MIN, DEFAULT_CYCLE)
    expect(at(0)).toMatchObject({ phase: 'focus', round: 1 })
    expect(at(24.9).phase).toBe('focus')
    expect(at(25)).toMatchObject({ phase: 'short', round: 1 })
    expect(at(30)).toMatchObject({ phase: 'focus', round: 2 })
    // After the 4th focus (4*25 + 3*5 = 115 min) comes the long break.
    expect(at(114)).toMatchObject({ phase: 'focus', round: 4 })
    expect(at(115)).toMatchObject({ phase: 'long', round: 4 })
    expect(at(129.9).phase).toBe('long')
    // Then the cycle starts again, counting on.
    expect(at(130)).toMatchObject({ phase: 'focus', round: 5 })
  })

  it('reports the time left in the phase', () => {
    const p = phaseAt(10 * MIN, DEFAULT_CYCLE)
    expect(p.remainingMs).toBe(15 * MIN)
    expect(p.intoMs).toBe(10 * MIN)
  })

  it('counts only focus time in a Focus run', () => {
    expect(focusMsWithin(10 * MIN, DEFAULT_CYCLE)).toBe(10 * MIN)
    expect(focusMsWithin(27 * MIN, DEFAULT_CYCLE)).toBe(25 * MIN)
    expect(focusMsWithin(32 * MIN, DEFAULT_CYCLE)).toBe(27 * MIN)
    expect(focusMsWithin(130 * MIN, DEFAULT_CYCLE)).toBe(100 * MIN)
    expect(focusMsWithin(0, DEFAULT_CYCLE)).toBe(0)
  })

  it('keeps edited lengths sensible and round-trips the stored list', () => {
    expect(clampCycle({ focus: 0, short: 999, long: NaN, every: 50 })).toEqual({
      focus: 1,
      short: 60,
      long: 15,
      every: 12,
    })
    expect(
      fromCycleList(toCycleList({ focus: 50, short: 10, long: 30, every: 2 })),
    ).toEqual({ focus: 50, short: 10, long: 30, every: 2 })
    expect(fromCycleList(undefined)).toEqual(DEFAULT_CYCLE)
    expect(fromCycleList([1, 2])).toEqual(DEFAULT_CYCLE)
  })

  it('formats a clock and a length', () => {
    expect(clock(65_000)).toBe('1:05')
    expect(clock(3_725_000)).toBe('1:02:05')
    expect(hoursLabel(95 * MIN)).toBe('1 h 35 min')
    expect(hoursLabel(20 * MIN)).toBe('20 min')
  })
})
