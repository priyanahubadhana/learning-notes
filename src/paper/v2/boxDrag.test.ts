/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GLIDE_MS,
  HOLD_MS,
  LIFT_SCALE,
  SAFETY_MS,
  createDragClock,
  glideFrom,
  playGlide,
  tabOnly,
} from './boxDrag'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('numbers of the picture (states panels 2 and 3)', () => {
  it('holds 120 ms, glides 200 ms, lifts to 1.02, ends a lost drag after 4 s', () => {
    expect([HOLD_MS, GLIDE_MS, LIFT_SCALE, SAFETY_MS]).toEqual([
      120, 200, 1.02, 4000,
    ])
  })
})

describe('createDragClock (TB-11, TB-18)', () => {
  it('lifts after the hold, not before', () => {
    const onHold = vi.fn()
    const c = createDragClock({ onHold, onSafety: vi.fn() })
    vi.advanceTimersByTime(HOLD_MS - 1)
    expect(onHold).not.toHaveBeenCalled()
    expect(c.held()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(onHold).toHaveBeenCalledTimes(1)
    expect(c.held()).toBe(true)
    c.stop()
  })
  it('ends by itself after 4 s without a sign of the finger; every move starts the 4 s again', () => {
    const onSafety = vi.fn()
    const c = createDragClock({ onHold: vi.fn(), onSafety })
    vi.advanceTimersByTime(3000)
    c.touch()
    vi.advanceTimersByTime(3000)
    expect(onSafety).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(onSafety).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(10000)
    expect(onSafety).toHaveBeenCalledTimes(1)
  })
  it('stop() cancels both timers (a normal lift)', () => {
    const onHold = vi.fn()
    const onSafety = vi.fn()
    const c = createDragClock({ onHold, onSafety })
    c.stop()
    vi.advanceTimersByTime(10000)
    expect(onHold).not.toHaveBeenCalled()
    expect(onSafety).not.toHaveBeenCalled()
  })
})

describe('glideFrom (TB-14)', () => {
  const r = (x: number, y: number, w = 100, h = 50) => ({
    left: x,
    top: y,
    width: w,
    height: h,
  })
  it('gives the way back from where the box was let go to where it lands', () => {
    expect(glideFrom(r(150, 80), r(100, 40))).toEqual({ dx: 50, dy: 40 })
  })
  it('gives nothing when it lands where it was let go', () => {
    expect(glideFrom(r(100, 40), r(100.2, 40.3))).toBeNull()
  })
})

describe('playGlide', () => {
  it('marks the box not tappable until the glide has ended, then calls done once', () => {
    let finish: () => void = () => {}
    const el = document.createElement('div')
    el.animate = vi.fn(() => {
      const a = { finished: new Promise<void>((r) => (finish = r)) }
      return a as unknown as Animation
    })
    const done = vi.fn()
    playGlide(el, { dx: 20, dy: 10 }, done)
    expect(el.hasAttribute('data-gliding')).toBe(true)
    expect(el.animate).toHaveBeenCalledWith(
      [
        { transform: `translate(20px, 10px) scale(${LIFT_SCALE})` },
        { transform: 'translate(0px, 0px) scale(1)' },
      ],
      expect.objectContaining({ duration: GLIDE_MS }),
    )
    expect(done).not.toHaveBeenCalled()
    finish()
    return Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => {
        expect(el.hasAttribute('data-gliding')).toBe(false)
        expect(done).toHaveBeenCalledTimes(1)
      })
  })
  it('ends at once when the screen cannot animate or asks for less motion', () => {
    const el = document.createElement('div')
    const done = vi.fn()
    playGlide(el, { dx: 20, dy: 10 }, done)
    expect(el.hasAttribute('data-gliding')).toBe(false)
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('tabOnly (owner, 14 Nov: only the tab moves a box)', () => {
  it('lets the tab and the layout cover drag, never the border strips', () => {
    const tab = document.createElement('button')
    tab.setAttribute('data-box-grip', '')
    const band = document.createElement('div')
    band.setAttribute('data-box-band', 'top')
    const cover = document.createElement('div')
    cover.setAttribute('data-layout-cover', 'x')
    expect(tabOnly(tab)).toBe(true)
    expect(tabOnly(cover)).toBe(true)
    expect(tabOnly(band)).toBe(false)
  })
})
