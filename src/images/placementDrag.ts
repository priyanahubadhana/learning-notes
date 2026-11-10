/** How close (px) to the top or bottom of the page the pointer starts to scroll it. */
export const EDGE_PX = 64
/** The fastest scroll (px per frame). */
export const MAX_STEP = 18

/**
 * Item 22b: how far to scroll the page this frame while the preview is
 * dragged at pointer height `y` in a window from `top` to `bottom`. Negative
 * is up. 0 away from the edges. The nearer the edge, the faster; at the very
 * edge or beyond, the fastest. Pure. (The page itself stops at its start and
 * end, so nothing here needs to know where the ends are.)
 */
export function autoScrollStep(y: number, top: number, bottom: number): number {
  if (!(bottom > top)) return 0
  const edge = Math.min(EDGE_PX, (bottom - top) / 3)
  if (y < top + edge) {
    const k = Math.min(1, (top + edge - y) / edge)
    return -Math.round(MAX_STEP * k * k + 1)
  }
  if (y > bottom - edge) {
    const k = Math.min(1, (y - (bottom - edge)) / edge)
    return Math.round(MAX_STEP * k * k + 1)
  }
  return 0
}
