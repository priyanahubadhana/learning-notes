import { describe, expect, it } from 'vitest'
import { clockText, msLeft, waitFor, type LimiterSteps } from './limiter'
import { waitAfter as lockWait } from './lock/lockState'
import { waitAfter as syncWait } from '../sync/unlockAttempts'

const rule: LimiterSteps = { free: 3, steps: [30_000, 60_000], cap: 3_600_000 }

describe('shared limiter', () => {
  it('is free for the first tries, then steps up, then holds at the cap', () => {
    expect([0, 1, 2].map((n) => waitFor(rule, n))).toEqual([0, 0, 0])
    expect(waitFor(rule, 3)).toBe(30_000)
    expect(waitFor(rule, 4)).toBe(60_000)
    expect(waitFor(rule, 5)).toBe(3_600_000)
    expect(waitFor(rule, 99)).toBe(3_600_000)
  })

  it('never reports more than the cap, and never below zero', () => {
    expect(msLeft(rule, 1_000_000, 0)).toBe(1_000_000)
    expect(msLeft(rule, 10 * 3_600_000, 0)).toBe(3_600_000)
    expect(msLeft(rule, 100, 5_000)).toBe(0)
  })

  it('writes a wait as m:ss, rounded up', () => {
    expect(clockText(28_000)).toBe('0:28')
    expect(clockText(27_100)).toBe('0:28')
    expect(clockText(272_000)).toBe('4:32')
    expect(clockText(-5)).toBe('0:00')
  })

  it('the lock uses 30 s, 1, 5, 15 min, then 1 h each', () => {
    const s = [3, 4, 5, 6, 7, 20].map((n) => lockWait(n) / 1000)
    expect(s).toEqual([30, 60, 300, 900, 3600, 3600])
  })

  it('the sync box keeps its steps: 1, 5, 15 min, then 1 h', () => {
    const s = [2, 3, 4, 5, 6].map((n) => syncWait(n) / 60_000)
    expect(s).toEqual([0, 1, 5, 15, 60])
  })
})
