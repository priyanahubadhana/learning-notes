import type { BridgeOutlineItem } from './readerBridge'

/** Height of one thumbnail row, and the rows drawn beyond the view. */
export const THUMB_ROW = 136
export const OVERSPILL = 3

/** The rows to draw for a scroll position (a long book draws a handful). */
export function visibleRows(
  top: number,
  height: number,
  count: number,
  row = THUMB_ROW,
  spill = OVERSPILL,
): { from: number; to: number } {
  const from = Math.max(0, Math.floor(top / row) - spill)
  const to = Math.min(count, Math.ceil((top + height) / row) + spill)
  return {
    from: Math.min(from, count),
    to: Math.max(Math.min(from, count), to),
  }
}

/** The contents entry the reader is in: the last one that has started. */
export function currentOutline(
  items: readonly BridgeOutlineItem[],
  page: number,
  label: string,
): number {
  let found = -1
  items.forEach((item, i) => {
    if (item.page > 0 ? item.page <= page : item.title === label) found = i
  })
  return found
}

/** The part of a page the scroller shows, as 0 to 1 fractions of the page. */
export function visibleFraction(
  page: { left: number; top: number; width: number; height: number },
  view: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number; w: number; h: number } {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const x0 = clamp((view.left - page.left) / (page.width || 1))
  const x1 = clamp((view.right - page.left) / (page.width || 1))
  const y0 = clamp((view.top - page.top) / (page.height || 1))
  const y1 = clamp((view.bottom - page.top) / (page.height || 1))
  return {
    x: x0,
    y: y0,
    w: Math.max(0.02, x1 - x0),
    h: Math.max(0.02, y1 - y0),
  }
}
