import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FRAME_FALLBACK_MS,
  cancelFrameOrTimer,
  frameOrTimer,
} from './frameOrTimer'

/**
 * C21 (CI WebKit, run 45565136359): the page painted no frame for over a
 * second, so a Pencil move drawn "on the next frame" showed up only when the
 * next hover woke the page. A move is now also drawn by a short timer.
 */
describe('frameOrTimer', () => {
  let frames: (() => void)[] = []
  beforeEach(() => {
    vi.useFakeTimers()
    frames = []
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
      frames.push(cb)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      frames[id - 1] = () => {}
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('runs once on a frame, and the timer then does nothing', () => {
    const fn = vi.fn()
    frameOrTimer(fn)
    frames[0]()
    vi.advanceTimersByTime(FRAME_FALLBACK_MS * 3)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs once on the timer when no frame ever comes', () => {
    const fn = vi.fn()
    frameOrTimer(fn)
    vi.advanceTimersByTime(FRAME_FALLBACK_MS + 1)
    expect(fn).toHaveBeenCalledTimes(1)
    frames[0]()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not run after it is cancelled', () => {
    const fn = vi.fn()
    const id = frameOrTimer(fn)
    cancelFrameOrTimer(id)
    frames.forEach((f) => f())
    vi.advanceTimersByTime(FRAME_FALLBACK_MS * 3)
    expect(fn).not.toHaveBeenCalled()
  })
})
