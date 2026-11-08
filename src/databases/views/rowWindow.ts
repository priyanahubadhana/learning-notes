/**
 * Row windowing: with thousands of rows only the ones near the screen are
 * drawn; empty space of the same height stands in for the rest. Pure maths,
 * kept apart from the hook (`useRowWindow.ts`) so it can be tested.
 */

/** Up to this many rows everything is drawn (no spacers, no surprises). */
export const WINDOW_THRESHOLD = 200

/** Rows drawn above and below the visible ones. */
export const OVERSCAN = 12

export interface RowRange {
  /** First row drawn. */
  start: number
  /** One past the last row drawn. */
  end: number
}

/**
 * Which rows to draw. `past` = how far the first row is above the top of
 * the screen (0 or negative = the list starts on screen), `view` = screen
 * height, `rowHeight` = height of one row.
 */
export function rowRange(
  count: number,
  rowHeight: number,
  past: number,
  view: number,
  overscan: number = OVERSCAN,
): RowRange {
  if (count <= WINDOW_THRESHOLD || rowHeight <= 0) {
    return { start: 0, end: count }
  }
  const from = Math.max(0, past)
  const first = Math.floor(from / rowHeight) - overscan
  const last = Math.ceil((from + Math.max(view, 0)) / rowHeight)
  const start = Math.max(0, Math.min(first, count - 1))
  const end = Math.min(count, Math.max(start + 1, last + overscan))
  return { start, end }
}
