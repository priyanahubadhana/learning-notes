/**
 * Reader v2 bars (slice 7a): which of the two bars is minimised, and when
 * the bars slide away while scrolling. Pure functions; the screen is in
 * ReaderBars.tsx. The choice is a small remembered setting on this device
 * (not component memory), so it survives a reload (RD-B08).
 */

/** true = shrunk to its edge chip. */
export interface BarState {
  reader: boolean
  draw: boolean
}

export const BARS_KEY = 'reader.bars'
export const DEFAULT_BARS: BarState = { reader: false, draw: false }

export const isBarState = (v: unknown): v is BarState =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as BarState).reader === 'boolean' &&
  typeof (v as BarState).draw === 'boolean'

export type BarId = keyof BarState

/** Flips one bar; the other one is never touched. */
export const setMinimised = (
  s: BarState,
  bar: BarId,
  minimised: boolean,
): BarState => ({ ...s, [bar]: minimised })

/** Scrolling down this far (px) hides the bars. */
export const HIDE_AFTER = 24
/** Scrolling up this far (px) brings them back (RD-B09). */
export const SHOW_AFTER = 12

export interface ScrollHide {
  hidden: boolean
  last: number
  /** Where the scroll last changed direction. */
  turn: number
  dir: -1 | 0 | 1
}

export const START_SCROLL: ScrollHide = {
  hidden: false,
  last: 0,
  turn: 0,
  dir: 0,
}

/** The next state after the page scrolled to `y`. */
export function scrollStep(s: ScrollHide, y: number): ScrollHide {
  if (y <= 0) return { hidden: false, last: 0, turn: 0, dir: 0 }
  const dir: ScrollHide['dir'] = y > s.last ? 1 : y < s.last ? -1 : s.dir
  const turn = dir !== s.dir ? s.last : s.turn
  let hidden = s.hidden
  if (dir === 1 && y - turn >= HIDE_AFTER) hidden = true
  if (dir === -1 && turn - y >= SHOW_AFTER) hidden = false
  return { hidden, last: y, turn, dir }
}
