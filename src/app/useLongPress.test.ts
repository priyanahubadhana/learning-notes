import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLongPress } from './useLongPress'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('long press', () => {
  it('fires after 500 ms and swallows the next click once', () => {
    const onLong = vi.fn()
    const lp = createLongPress(onLong)
    lp.down(10, 10)
    vi.advanceTimersByTime(499)
    expect(onLong).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onLong).toHaveBeenCalledWith(10, 10)
    lp.up()
    expect(lp.consumeClick()).toBe(true)
    expect(lp.consumeClick()).toBe(false)
  })

  it('a short tap does not fire and does not swallow the click', () => {
    const onLong = vi.fn()
    const lp = createLongPress(onLong)
    lp.down(0, 0)
    vi.advanceTimersByTime(200)
    lp.up()
    vi.advanceTimersByTime(1000)
    expect(onLong).not.toHaveBeenCalled()
    expect(lp.consumeClick()).toBe(false)
  })

  it('moving more than 8 px cancels; a small wobble does not', () => {
    const onLong = vi.fn()
    const lp = createLongPress(onLong)
    lp.down(0, 0)
    lp.move(5, 5)
    vi.advanceTimersByTime(500)
    expect(onLong).toHaveBeenCalledTimes(1)
    lp.down(0, 0)
    lp.move(9, 0)
    vi.advanceTimersByTime(1000)
    expect(onLong).toHaveBeenCalledTimes(1)
  })
})
