/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SAMPLE_FRAMES, setGlassLite, startGlassProbe } from './glass'

/** A fake frame clock: each `frame(ms)` runs the queued callback at now + ms. */
function fakeFrames() {
  let queued: FrameRequestCallback | null = null
  let now = 1000
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queued = cb
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    queued = null
  })
  return {
    frame(ms: number) {
      now += ms
      const cb = queued
      queued = null
      cb?.(now)
    },
    get waiting() {
      return queued !== null
    },
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  setGlassLite(false)
})

describe('the automatic less-glass probe', () => {
  it('stays quiet at 60 fps and does not run without scrolling or drawing', () => {
    const clock = fakeFrames()
    const slow = vi.fn()
    const stop = startGlassProbe(slow)
    expect(clock.waiting).toBe(false)
    window.dispatchEvent(new Event('scroll'))
    for (let i = 0; i < SAMPLE_FRAMES * 3; i++) clock.frame(16.7)
    expect(slow).not.toHaveBeenCalled()
    stop()
  })

  it('trips once on slow frames while scrolling, then stops listening', () => {
    const clock = fakeFrames()
    const slow = vi.fn()
    startGlassProbe(slow)
    window.dispatchEvent(new Event('pointermove'))
    for (let i = 0; i < SAMPLE_FRAMES + 2; i++) clock.frame(45)
    expect(slow).toHaveBeenCalledTimes(1)
    expect(clock.waiting).toBe(false)
    // Further bursts do nothing: it is kept for the session.
    window.dispatchEvent(new Event('scroll'))
    expect(clock.waiting).toBe(false)
    expect(slow).toHaveBeenCalledTimes(1)
  })

  it('does not count the long pause between two bursts as a slow frame', () => {
    const clock = fakeFrames()
    const slow = vi.fn()
    const stop = startGlassProbe(slow)
    for (let burst = 0; burst < 5; burst++) {
      window.dispatchEvent(new Event('scroll'))
      for (let i = 0; i < 10; i++) clock.frame(16.7)
      vi.advanceTimersByTime(700) // idle: the probe sleeps and forgets
      clock.frame(5000) // a stale callback after a long sleep: ignored
    }
    expect(slow).not.toHaveBeenCalled()
    stop()
  })

  it('setGlassLite flips the switch the CSS fallbacks key on', () => {
    setGlassLite(true)
    expect(document.documentElement.dataset.glass).toBe('lite')
    setGlassLite(false)
    expect(document.documentElement.dataset.glass).toBeUndefined()
  })
})
