/**
 * Swipe rules for the Calendar Day card, apart from the screen so they can
 * be tested. A swipe is mostly sideways, long enough and quick enough, so a
 * slow drag (selecting text) or a scroll never changes the day.
 */

export const SWIPE_MIN_PX = 60
export const SWIPE_MAX_MS = 700

/**
 * -1 = back to the previous day, 1 = on to the next day, 0 = not a swipe.
 * `dx`/`dy` are the finger's travel (positive dx = to the right).
 */
export function swipeDirection(dx: number, dy: number, ms: number): -1 | 0 | 1 {
  if (ms > SWIPE_MAX_MS) return 0
  if (Math.abs(dx) < SWIPE_MIN_PX) return 0
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return 0
  // Dragging the card to the right shows what came before it.
  return dx > 0 ? -1 : 1
}
