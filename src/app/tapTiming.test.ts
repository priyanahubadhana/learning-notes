// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { refuseInput, tapGraceOn } from '../editor/penGuard'
import { isDoubleTap, isShort, isTap } from '../ink/tapFilter'
import { setFlag } from './flags'
import {
  gapMs,
  TAP_SPEED_KEY,
  tapHoldMs,
  tapMovePx,
  tapSpeed,
} from './tapTiming'

afterEach(() => {
  setFlag('textbox.v2', false)
  localStorage.removeItem(TAP_SPEED_KEY)
})

describe('one tap timing (C14)', () => {
  it('switch off: the old numbers', () => {
    expect(gapMs(450)).toBe(450)
    expect(tapHoldMs(150)).toBe(150)
    expect(tapMovePx(3)).toBe(3)
    expect(isShort(200, 5)).toBe(false)
  })
  it('switch on, Normal picked: 500 ms between taps, a tap up to 250 ms and 8 px', () => {
    setFlag('textbox.v2', true)
    // C19: Relaxed is the speed when nothing is picked (tapNear.test.ts).
    localStorage.setItem(TAP_SPEED_KEY, '"normal"')
    expect(gapMs(450)).toBe(500)
    expect(gapMs(300)).toBe(500)
    expect(isShort(240, 7)).toBe(true)
    expect(isShort(260, 2)).toBe(false)
    expect(isShort(100, 9)).toBe(false)
    expect(isDoubleTap({ at: 0, x: 0, y: 0 }, { at: 480, x: 4, y: 3 })).toBe(
      true,
    )
    expect(isDoubleTap({ at: 0, x: 0, y: 0 }, { at: 520, x: 0, y: 0 })).toBe(
      false,
    )
    // A single Pen tap still draws its dot (only a second tap takes it back).
    expect(isTap(200, 5)).toBe(false)
  })
  it('the preview "Tap speed" pick: Quick 350, Relaxed 700, Wide 1000; junk = none picked (Wide, F7 18 Nov)', () => {
    setFlag('textbox.v2', true)
    localStorage.setItem(TAP_SPEED_KEY, '"quick"')
    expect(gapMs(450)).toBe(350)
    localStorage.setItem(TAP_SPEED_KEY, '"relaxed"')
    expect(gapMs(450)).toBe(700)
    localStorage.setItem(TAP_SPEED_KEY, '"wide"')
    expect(gapMs(450)).toBe(1000)
    localStorage.setItem(TAP_SPEED_KEY, '{bad')
    expect(tapSpeed()).toBe('wide')
  })
  it('a Pencil tap never deletes: deletes are refused for the gap + 200 ms', () => {
    setFlag('textbox.v2', true)
    localStorage.setItem(TAP_SPEED_KEY, '"normal"')
    const pen = { down: false, upAt: 0, tapAt: 1000 }
    expect(tapGraceOn(pen, 1600)).toBe(true)
    expect(tapGraceOn(pen, 1800)).toBe(false)
    expect(refuseInput('deleteContentBackward', 1300, pen, -1e9, true)).toBe(
      true,
    )
    // Writing (Scribble after a tap) is not held back; a key is the person's.
    expect(refuseInput('insertText', 1300, pen, -1e9, true)).toBe(false)
    expect(refuseInput('deleteContentBackward', 1300, pen, 1200, true)).toBe(
      false,
    )
  })
})
