export type Rect = { left: number; top: number; right: number; bottom: number }

const GAP = 8

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/**
 * Where a menu card of w x h goes (C23): as near `at` as it fits, always inside
 * `view` and inside `within` (a panel or page frame: never across its edge),
 * and never over `clear` (the box and its bar).
 */
export function placeClear(
  card: { w: number; h: number },
  at: { x: number; y: number },
  view: Rect,
  within?: { left: number; right: number },
  clear?: Rect | Rect[],
): { x: number; y: number } {
  const lo = Math.max(view.left, within?.left ?? view.left) + GAP
  const hi = Math.min(view.right, within?.right ?? view.right) - GAP
  const top = view.top + GAP
  const bottom = view.bottom - GAP
  const fx = (x: number) => Math.max(lo, Math.min(x, hi - card.w))
  const fy = (y: number) => Math.max(top, Math.min(y, bottom - card.h))
  const here = { x: fx(at.x), y: fy(at.y) }
  const rect = (p: { x: number; y: number }): Rect => ({
    left: p.x,
    top: p.y,
    right: p.x + card.w,
    bottom: p.y + card.h,
  })
  // Several rects are tried in turn, the most important last: the box and its
  // bar first; if no spot keeps clear of both, at least keep clear of the box.
  const levels = clear ? (Array.isArray(clear) ? clear : [clear]) : []
  if (!levels.length) return here
  for (const lv of levels) {
    if (!overlaps(rect(here), lv)) return here
    const tries = [
      { x: lv.right + GAP, y: at.y },
      { x: lv.left - GAP - card.w, y: at.y },
      { x: at.x, y: lv.bottom + GAP },
      { x: at.x, y: lv.top - GAP - card.h },
    ]
    for (const c of tries) {
      const p = { x: fx(c.x), y: fy(c.y) }
      if (!overlaps(rect(p), lv)) return p
    }
  }
  return here
}
