export type Rect = { left: number; top: number; right: number; bottom: number }

/**
 * A panel or page frame: left/right always; top/bottom when it has them (a
 * sheet). `clipTop`/`clipBottom`: the page's visible area, so a box menu never
 * covers the app's bars above or below the page.
 */
export type Frame = {
  left: number
  right: number
  top?: number
  bottom?: number
  clipTop?: number
  clipBottom?: number
}

const GAP = 8

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/**
 * Where a menu card of w x h goes (C23): as near `at` as it fits, always inside
 * `view`, inside `within`'s left and right edges, never across its top or
 * bottom edge (wholly inside the frame, or wholly above or below it), and never
 * over `clear` (the box and its bar). The rects in `clear` are tried most
 * important last: a spot clear of all of them first, then of all but the first,
 * and so on. With `minH` a card may come out shorter (its rows scroll inside):
 * the returned `h`.
 */
export function placeClear(
  card: { w: number; h: number; minH?: number },
  at: { x: number; y: number },
  view: Rect,
  within?: Frame,
  clear?: Rect | Rect[],
): { x: number; y: number; h: number } {
  const lo = Math.max(view.left, within?.left ?? view.left) + GAP
  const hi = Math.min(view.right, within?.right ?? view.right) - GAP
  const top = Math.max(view.top, within?.clipTop ?? view.top) + GAP
  const bottom = Math.min(view.bottom, within?.clipBottom ?? view.bottom) - GAP
  const minH = Math.min(card.minH ?? card.h, card.h)
  const fx = (x: number) => Math.max(lo, Math.min(x, hi - card.w))
  const fy = (y: number, h: number) => Math.max(top, Math.min(y, bottom - h))
  const here = { x: fx(at.x), y: fy(at.y, card.h), h: card.h }
  const ft = within?.top
  const fb = within?.bottom
  // Never across the frame's top or bottom edge.
  const frameOk = (r: Rect) =>
    ft === undefined ||
    fb === undefined ||
    r.bottom <= ft ||
    r.top >= fb ||
    (r.top >= ft && r.bottom <= fb)
  const levels = clear ? (Array.isArray(clear) ? clear : [clear]) : []
  const xs = [
    at.x,
    ...levels.flatMap((l) => [l.right + GAP, l.left - GAP - card.w]),
  ]
  const ys = [
    at.y,
    ...levels.flatMap((l) => [l.bottom + GAP, l.top - GAP - card.h]),
  ]
  if (ft !== undefined && fb !== undefined)
    ys.push(ft + GAP, fb - GAP - card.h, fb + GAP, ft - GAP - card.h)
  const spots: { x: number; y: number; h: number }[] = []
  for (const x of xs)
    for (const y0 of ys) {
      const y = fy(y0, card.h)
      spots.push({ x: fx(x), y, h: card.h })
      // Shorter, from where it would start: down to the frame's or view's end.
      const s = Math.max(top, y0)
      for (const end of [
        bottom,
        fb !== undefined && s < fb ? fb - GAP : bottom,
      ]) {
        const h = Math.min(card.h, end - s)
        if (h >= minH && h < card.h) spots.push({ x: fx(x), y: s, h })
      }
    }
  // Shorter, ending just above a rect or the frame, from the top of the view.
  const ends = levels.map((l) => l.top - GAP)
  if (ft !== undefined) ends.push(ft - GAP)
  for (const x of xs)
    for (const end of ends) {
      const h = end - top
      if (h >= minH && h < card.h) spots.push({ x: fx(x), y: top, h })
    }
  const cost = (p: { x: number; y: number; h: number }) =>
    (p.h < card.h ? 10000 : 0) + Math.abs(p.x - here.x) + Math.abs(p.y - here.y)
  for (let i = 0; i <= levels.length; i++) {
    const keep = levels.slice(i)
    const ok = spots
      .filter((p) => {
        const r = {
          left: p.x,
          top: p.y,
          right: p.x + card.w,
          bottom: p.y + p.h,
        }
        return (
          r.bottom <= bottom + 0.5 &&
          frameOk(r) &&
          keep.every((l) => !overlaps(r, l))
        )
      })
      .sort((a, b) => cost(a) - cost(b))
    if (ok.length) return ok[0]
  }
  return here
}
