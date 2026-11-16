// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setFlag } from '../app/flags'
import { toolState } from '../app/gestureReset'
import { stampOf, TAP_SPEED_KEY, withinGap } from '../app/tapTiming'
import type { AppSchema } from './schema'
import { watchTapSelect } from './tapSelect'

/**
 * C14: taps are timed by the events' own time stamps (when the Pencil
 * touched), not by when the listener ran. Here the page is "busy": its clocks
 * (Date.now, performance.now) jump far ahead between two events, as they do
 * when a listener runs late. The time stamps say what the hand did.
 */

let clock = 0
let stop = () => {}
let words: HTMLElement

/** One Pencil event with the browser's time stamp `stamp` (ms). */
function pen(type: string, stamp: number, x = 10, y = 10) {
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

/** The page was busy for `ms`: every clock a listener can read moves on. */
const busy = (ms: number) => {
  clock += ms
}

const taps = () =>
  toolState().tapSelect as { down: string | null; lastCount: number }

beforeEach(() => {
  clock = 50_000
  vi.spyOn(Date, 'now').mockImplementation(() => 1_700_000_000_000 + clock)
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  const dom = document.createElement('div')
  words = document.createElement('p')
  dom.append(words)
  document.body.append(dom)
  const editor = { domElement: dom, prosemirrorView: undefined }
  stop = watchTapSelect(
    editor as unknown as AppSchema['BlockNoteEditor'],
    () => {},
  )
})

afterEach(() => {
  stop()
  vi.restoreAllMocks()
  setFlag('textbox.v2', false)
  localStorage.removeItem(TAP_SPEED_KEY)
  document.body.replaceChildren()
})

describe('tap timing by the events own time stamps (C14)', () => {
  for (const on of [false, true]) {
    it(`a busy listener does not stretch the gap between two taps (switch ${on ? 'on' : 'off'})`, () => {
      setFlag('textbox.v2', on)
      pen('pointerdown', 1000)
      pen('pointerup', 1100)
      expect(taps().lastCount).toBe(1)
      // The page is busy for 2 s; the second tap came 400 ms after the first.
      busy(2000)
      pen('pointerdown', 1500)
      expect(taps().down).toBe('#1 count 2')
    })
  }

  it('a busy listener does not turn a 200 ms tap into a hold', () => {
    pen('pointerdown', 1000)
    busy(900)
    pen('pointerup', 1200)
    // Still a tap: the next one within the gap is the second of the run.
    expect(taps().lastCount).toBe(1)
    pen('pointerdown', 1500)
    expect(taps().down).toBe('#1 count 2')
  })

  it('taps really too far apart start again, however quick the listener', () => {
    pen('pointerdown', 1000)
    pen('pointerup', 1100)
    pen('pointerdown', 1700)
    expect(taps().down).toBe('#1 count 1')
  })

  it('a press really held 400 ms is not a tap', () => {
    pen('pointerdown', 1000)
    pen('pointerup', 1400)
    expect(taps().lastCount).toBe(0)
  })
})

describe('withinGap and stampOf', () => {
  it('switch on, Normal picked: taps up to 500 ms apart add up, 500 itself included', () => {
    setFlag('textbox.v2', true)
    localStorage.setItem(TAP_SPEED_KEY, '"normal"')
    expect(withinGap(500, 450)).toBe(true)
    expect(withinGap(500.5, 450)).toBe(false)
  })
  it('switch off: under the old number, as before', () => {
    expect(withinGap(449, 450)).toBe(true)
    expect(withinGap(450, 450)).toBe(false)
  })
  it('an event without a time stamp gets the same clock now', () => {
    expect(stampOf({ timeStamp: 1234.5 })).toBe(1234.5)
    expect(stampOf({ timeStamp: 0 })).toBe(clock)
  })
})
