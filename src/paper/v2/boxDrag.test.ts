/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { inputMachine } from '../../app/inputMachine'
import {
  GLIDE_MS,
  HOLD_MS,
  LIFT_SCALE,
  BEAT_MS,
  createDragClock,
  watchFinger,
  glideFrom,
  playGlide,
  tabOnly,
} from './boxDrag'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('numbers of the picture (states panels 2 and 3)', () => {
  it('holds 120 ms, glides 200 ms, lifts to 1.02, beats every second', () => {
    expect([HOLD_MS, GLIDE_MS, LIFT_SCALE, BEAT_MS]).toEqual([
      120, 200, 1.02, 1000,
    ])
  })
})

describe('createDragClock (TB-11, TB-18)', () => {
  const make = (lost = () => false) => {
    const o = { onHold: vi.fn(), onLost: vi.fn(), lost: vi.fn(lost) }
    return { o, c: createDragClock({ pointerId: 7, ...o }) }
  }
  it('lifts after the hold, not before', () => {
    const { o, c } = make()
    vi.advanceTimersByTime(HOLD_MS - 1)
    expect(o.onHold).not.toHaveBeenCalled()
    expect(c.held()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(o.onHold).toHaveBeenCalledTimes(1)
    expect(c.held()).toBe(true)
    c.stop()
  })
  it('a finger held still for 5 s never ends the drag, and keeps the input machine told', () => {
    const move = vi.spyOn(inputMachine, 'move')
    const { o, c } = make()
    vi.advanceTimersByTime(5000)
    expect(o.onLost).not.toHaveBeenCalled()
    expect(move).toHaveBeenCalledTimes(5)
    expect(move).toHaveBeenCalledWith({ pointerId: 7 })
    c.stop()
  })
  it('ends only when the pointer is really lost', () => {
    let gone = false
    const { o, c } = make(() => gone)
    vi.advanceTimersByTime(3000)
    expect(o.onLost).not.toHaveBeenCalled()
    gone = true
    vi.advanceTimersByTime(1000)
    expect(o.onLost).toHaveBeenCalledTimes(1)
    c.stop()
  })
  it('stop() cancels both timers (a normal lift)', () => {
    const { o, c } = make(() => true)
    c.stop()
    vi.advanceTimersByTime(10000)
    expect(o.onHold).not.toHaveBeenCalled()
    expect(o.onLost).not.toHaveBeenCalled()
  })
})

describe('watchFinger (TB-18)', () => {
  const moveEvent = (pointerId: number, buttons: number) =>
    Object.assign(new Event('pointermove', { bubbles: true }), {
      pointerId,
      buttons,
    })
  it('ends on a move of the same pointer with no button down, not on others', () => {
    const lost = vi.fn()
    const off = watchFinger(3, lost)
    document.dispatchEvent(moveEvent(3, 1))
    document.dispatchEvent(moveEvent(4, 0))
    expect(lost).not.toHaveBeenCalled()
    document.dispatchEvent(moveEvent(3, 0))
    expect(lost).toHaveBeenCalledTimes(1)
    off()
  })
  it('ends when the app goes to the background; nothing after off()', () => {
    const lost = vi.fn()
    const off = watchFinger(3, lost)
    window.dispatchEvent(new Event('blur'))
    expect(lost).toHaveBeenCalledTimes(1)
    off()
    window.dispatchEvent(new Event('blur'))
    expect(lost).toHaveBeenCalledTimes(1)
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
      expect.objectContaining({
        duration: GLIDE_MS,
        easing: 'cubic-bezier(.2,.8,.2,1)',
      }),
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
  // CI run 45979405230 (TB-14, ipad-webkit): the box kept data-gliding for over
  // 1.2 s after a 200 ms glide. Measured on WebKit: the animation reports
  // playState 'finished' up to 300 ms before its finished promise settles, and
  // its start can wait for a paint too. The landing must follow the glide's own
  // clock, not the promise.
  const lateAnimation = (clock: { t: number | null }) => {
    const finish = vi.fn(() => (clock.t = GLIDE_MS))
    const a = {
      finished: new Promise<void>(() => {}), // settles late (here never)
      get currentTime() {
        return clock.t
      },
      finish,
    }
    return a as unknown as Animation & { finish: typeof finish }
  }
  it('lands when the glide time is up, even if the finished promise is late', () => {
    const clock = { t: 0 as number | null }
    const el = document.createElement('div')
    el.animate = vi.fn(() => lateAnimation(clock))
    const done = vi.fn()
    playGlide(el, { dx: 20, dy: 10 }, done)
    clock.t = GLIDE_MS - 50 // started 50 ms late: still moving at 200 ms
    vi.advanceTimersByTime(GLIDE_MS)
    expect(el.hasAttribute('data-gliding')).toBe(true)
    clock.t = GLIDE_MS
    vi.advanceTimersByTime(50)
    expect(el.hasAttribute('data-gliding')).toBe(false)
    expect(done).toHaveBeenCalledTimes(1)
  })
  it('lands at once when the glide never started by its end time', () => {
    const clock = { t: null as number | null }
    const el = document.createElement('div')
    const a = lateAnimation(clock)
    el.animate = vi.fn(() => a)
    const done = vi.fn()
    playGlide(el, { dx: 20, dy: 10 }, done)
    vi.advanceTimersByTime(GLIDE_MS)
    expect(a.finish).toHaveBeenCalled()
    expect(el.hasAttribute('data-gliding')).toBe(false)
    expect(done).toHaveBeenCalledTimes(1)
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
