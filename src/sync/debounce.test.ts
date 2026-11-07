import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounceMax } from './debounce'

describe('debounceMax', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs once, 2 s after the last call', () => {
    const fn = vi.fn()
    const d = debounceMax(fn, 2000, 10_000)
    d.call()
    vi.advanceTimersByTime(1500)
    d.call()
    vi.advanceTimersByTime(1500)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(600)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs by the max wait while calls keep coming', () => {
    const fn = vi.fn()
    const d = debounceMax(fn, 2000, 10_000)
    for (let i = 0; i < 12; i++) {
      d.call()
      vi.advanceTimersByTime(1000)
    }
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('starts a new burst after a run, and cancel stops it', () => {
    const fn = vi.fn()
    const d = debounceMax(fn, 2000, 10_000)
    d.call()
    vi.advanceTimersByTime(2000)
    d.call()
    d.cancel()
    vi.advanceTimersByTime(20_000)
    expect(fn).toHaveBeenCalledTimes(1)
    d.call()
    vi.advanceTimersByTime(2000)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
