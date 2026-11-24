import { clampInArea, type Area, type FreePos } from './miniBarPrefs'

/** A rectangle on the screen. */
export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Does the bar at `p` (centre x, top y) cover any of the text lines? */
export function coversText(
  p: FreePos,
  size: { width: number; height: number },
  lines: Rect[],
): boolean {
  const l = p.left - size.width / 2
  const r = p.left + size.width / 2
  const t = p.top
  const b = p.top + size.height
  return lines.some(
    (x) =>
      x.left < r - 1 && x.right > l + 1 && x.top < b - 1 && x.bottom > t + 1,
  )
}

/**
 * Where the mini bar goes (F7, owner rule 18 Nov): a bar never covers words and
 * never leaves the page. Above the selected line when that spot holds no text
 * line, else below the selection, else free space above the first or below the
 * last line of the page; if none is free, the old place (above, else below).
 * Pure, tested.
 */
export function placeBar(o: {
  centre: number
  size: { width: number; height: number }
  area: Area
  lines: Rect[]
  lineTop: number
  lineBottom: number
}): FreePos {
  const { size, area, lines } = o
  const h = size.height
  const above = o.lineTop - h - 8
  const below = o.lineBottom + 28
  const firstTop = lines.length
    ? Math.min(...lines.map((x) => x.top))
    : o.lineTop
  const lastBottom = lines.length
    ? Math.max(...lines.map((x) => x.bottom))
    : o.lineBottom
  const tries = [above, below, lastBottom + 28, firstTop - h - 8]
  for (const top of tries) {
    const p = clampInArea({ left: o.centre, top }, size, area)
    // A spot the clamp had to move is not the spot tried.
    if (Math.abs(p.top - top) > 1) continue
    if (!coversText(p, size, lines)) return p
  }
  return clampInArea(
    { left: o.centre, top: above >= area.top + 8 ? above : below },
    size,
    area,
  )
}
