import type { BarMode } from './readingPrefs'

/**
 * Whether the reader's top bar shows (B1). Pure, so it is easy to test:
 * - `always`: always;
 * - `top`: only while the page is at (or near) the top;
 * - `mini`: hidden while you scroll down, back after you scroll up by a
 *   little (10 px) and always at the top.
 */

const SCROLL_THRESHOLD = 10
const TOP_ZONE = 8

export interface BarState {
  visible: boolean
  /** The scroll position where the current direction began. */
  anchor: number
}

export const startBar = (): BarState => ({
  visible: true,
  anchor: 0,
})

export function barStep(
  mode: BarMode,
  state: BarState,
  y: number,
  threshold: number = SCROLL_THRESHOLD,
): BarState {
  if (mode === 'always') return { visible: true, anchor: y }
  if (y <= TOP_ZONE) return { visible: true, anchor: y }
  if (mode === 'top') return { visible: false, anchor: y }
  // mini
  if (state.visible) {
    // Going down by the threshold hides it; going up moves the anchor up.
    if (y - state.anchor >= threshold) return { visible: false, anchor: y }
    return { visible: true, anchor: Math.min(state.anchor, y) }
  }
  // Hidden: going up by the threshold shows it; going down moves the anchor down.
  if (state.anchor - y >= threshold) return { visible: true, anchor: y }
  return { visible: false, anchor: Math.max(state.anchor, y) }
}
