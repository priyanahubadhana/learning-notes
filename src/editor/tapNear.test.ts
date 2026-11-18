// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setFlag } from '../app/flags'
import { toolState } from '../app/gestureReset'
import { gapMs, TAP_SPEED_KEY, tapSpeed } from '../app/tapTiming'
import type { AppSchema } from './schema'
import { nextTapCount, watchTapSelect } from './tapSelect'

/**
 * C19 (owner's iPad re-test, 16 Nov): double and triple taps worked only
 * sometimes, worst in the middle of a word right after a tap had put the
 * cursor there, and a pop-up flashed.
 */

afterEach(() => {
  setFlag('textbox.v2', false)
  localStorage.removeItem(TAP_SPEED_KEY)
  document.body.replaceChildren()
})

describe('tap speed (C19)', () => {
  it('Wide (1000 ms, F7 18 Nov) when nothing is picked', () => {
    setFlag('textbox.v2', true)
    expect(tapSpeed()).toBe('wide')
    expect(gapMs(450)).toBe(1000)
  })
  it('a pick still wins; the switch off keeps the old number', () => {
    setFlag('textbox.v2', true)
    localStorage.setItem(TAP_SPEED_KEY, '"normal"')
    expect(gapMs(450)).toBe(500)
    setFlag('textbox.v2', false)
    expect(gapMs(450)).toBe(450)
  })
})

describe('how far off the next tap may land (C19)', () => {
  const last = { at: 1000, x: 100, y: 100, count: 1 }
  it('switch on: within 24 px is the same spot', () => {
    setFlag('textbox.v2', true)
    expect(nextTapCount(last, 1400, 120, 100)).toBe(2)
    expect(nextTapCount(last, 1400, 100 + 16, 100 + 16)).toBe(2)
    expect(nextTapCount(last, 1400, 126, 100)).toBe(1)
  })
  it('switch on: further off still counts on the same word, never too late', () => {
    setFlag('textbox.v2', true)
    expect(nextTapCount(last, 1400, 160, 100, true)).toBe(2)
    // The picked Relaxed speed (700 ms) still ends a run at 701 ms.
    localStorage.setItem(TAP_SPEED_KEY, '"relaxed"')
    expect(nextTapCount(last, 1000 + 701, 160, 100, true)).toBe(1)
    // F7: with nothing picked, taps 600 and 950 ms apart still add up; 1001 does not.
    localStorage.removeItem(TAP_SPEED_KEY)
    expect(nextTapCount(last, 1000 + 600, 100, 100)).toBe(2)
    expect(nextTapCount(last, 1000 + 950, 120, 100)).toBe(2)
    expect(nextTapCount(last, 1000 + 1001, 100, 100)).toBe(1)
    // Two taps far apart on different words never join, however quick.
    expect(nextTapCount(last, 1000 + 600, 300, 100, false)).toBe(1)
  })
  it('switch off: 12 px, as before', () => {
    expect(nextTapCount(last, 1400, 112, 100)).toBe(2)
    expect(nextTapCount(last, 1400, 120, 100)).toBe(1)
  })
})

describe('a Pencil tap on the text cursor (C19)', () => {
  let words: HTMLElement
  let stop = () => {}
  let focused = true

  beforeEach(() => {
    focused = true
    const dom = document.createElement('div')
    words = document.createElement('p')
    dom.append(words)
    document.body.append(dom)
    // The cursor stands at x = 100, between y = 90 and y = 110.
    const view = {
      dom,
      hasFocus: () => focused,
      state: { selection: { head: 5, anchor: 5, empty: true } },
      coordsAtPos: () => ({ left: 100, right: 100, top: 90, bottom: 110 }),
      posAtCoords: () => null,
    }
    const editor = { domElement: dom, prosemirrorView: view }
    stop = watchTapSelect(
      editor as unknown as AppSchema['BlockNoteEditor'],
      () => {},
    )
  })
  afterEach(() => stop())

  function pen(type: string, stamp: number, x: number, y: number) {
    const e = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    })
    Object.defineProperties(e, {
      timeStamp: { value: stamp },
      pointerId: { value: 1 },
      pointerType: { value: 'pen' },
    })
    words.dispatchEvent(e)
  }
  /** The Pencil's lift as Safari sends it: a touch of type "stylus". */
  function lift(stamp: number, x: number, y: number, touchType = 'stylus') {
    const e = new Event('touchend', { bubbles: true, cancelable: true })
    Object.defineProperties(e, {
      timeStamp: { value: stamp },
      changedTouches: { value: [{ touchType, clientX: x, clientY: y }] },
    })
    words.dispatchEvent(e)
    return e.defaultPrevented
  }
  /** One Pencil tap at (x, y); true when its lift was kept from the browser. */
  function tap(at: number, x: number, y: number, moved = 0) {
    pen('pointerdown', at, x, y)
    pen('pointerup', at + 120, x + moved, y)
    return lift(at + 121, x + moved, y)
  }

  it('its lift is kept from the browser, so no edit menu opens', () => {
    setFlag('textbox.v2', true)
    expect(tap(1000, 104, 100)).toBe(true)
    expect(tap(3000, 85, 112)).toBe(true)
  })
  it('the tap still counts: the next one is the second of a double tap', () => {
    setFlag('textbox.v2', true)
    tap(1000, 104, 100)
    pen('pointerdown', 1500, 110, 101)
    expect((toolState().tapSelect as { down: string }).down).toBe('#1 count 2')
  })
  it('a tap away from the cursor is left to the browser', () => {
    setFlag('textbox.v2', true)
    expect(tap(1000, 300, 100)).toBe(false)
    expect(tap(3000, 104, 160)).toBe(false)
  })
  it('a stroke that starts at the cursor (Scribble writing) is never held back', () => {
    setFlag('textbox.v2', true)
    expect(tap(1000, 104, 100, 40)).toBe(false)
  })
  it('a finger, an editor without the focus, the switch off: left alone', () => {
    setFlag('textbox.v2', true)
    pen('pointerdown', 1000, 104, 100)
    pen('pointerup', 1100, 104, 100)
    expect(lift(1101, 104, 100, 'direct')).toBe(false)
    focused = false
    expect(tap(3000, 104, 100)).toBe(false)
    focused = true
    setFlag('textbox.v2', false)
    expect(tap(5000, 104, 100)).toBe(false)
  })
})
