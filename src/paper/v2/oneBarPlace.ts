/**
 * Where the one bar of a selected box stands (box bar part A). Pure, so it is
 * tested without a browser. Beside the box first: above it, else below it, and
 * only when the box leaves no room around it, any free space of the page. It
 * never covers words, never leaves the page frame, and keeps clear of the top
 * 12 px of the screen. Numbers are screen px.
 */
export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/** The bar never gets nearer than this to the screen's top and bottom (px). */
export const SAFE = 12
/** Sideways, the bar keeps this far inside the page frame (px). */
export const SIDE = 8
/** Above a box the bar clears the tab row (44 pt + its 28 px margin). */
export const ABOVE_GAP = 72
/** Under a box the bar clears the 8 dots, which sit 16 px outside the edge. */
export const BELOW_GAP = 24

export interface PlaceIn {
  bar: { w: number; h: number }
  box: Rect
  /** The page frame (the sheet, or the page column on a phone). */
  frame: Rect
  /** What the screen shows of the page (a bottom bar is not room). */
  view: Rect
  /** Words of the other boxes and the Add-a-box button: never covered. */
  others: Rect[]
  /** Where the box's own tab row sits under it (the bar goes under that). */
  tabBelow?: Rect
}

export interface PlaceOut {
  x: number
  y: number
  where: 'above' | 'below' | 'free'
}

const meets = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

export function placeOneBar(i: PlaceIn): PlaceOut {
  const { bar, box, frame, view, others } = i
  // Sideways: with the box's left edge, pulled inside the frame.
  const room = Math.max(0, frame.right - frame.left - 2 * SIDE)
  const w = Math.min(bar.w, room || bar.w)
  const x = Math.min(
    Math.max(box.left, frame.left + SIDE),
    Math.max(frame.left + SIDE, frame.right - SIDE - w),
  )
  const clear = (top: number) => {
    if (top < view.top + SAFE || top + bar.h > view.bottom - SAFE) return false
    const me: Rect = { left: x, top, right: x + w, bottom: top + bar.h }
    if (meets(me, box)) return false
    return !others.some((o) => meets(me, o))
  }
  const above = box.top - ABOVE_GAP - bar.h
  const below = i.tabBelow ? i.tabBelow.bottom + 12 : box.bottom + BELOW_GAP
  if (clear(above)) return { x, y: above, where: 'above' }
  if (clear(below)) return { x, y: below, where: 'below' }
  // No room beside the box: any free space of the page, top first, then the
  // bottom, then just under the last of the others.
  const tries = [
    view.top + SAFE,
    view.bottom - SAFE - bar.h,
    ...others.map((o) => o.bottom + 8),
  ]
  for (const top of tries) if (clear(top)) return { x, y: top, where: 'free' }
  // Nothing is free: as near under the box as the screen allows.
  const y = Math.max(
    view.top + SAFE,
    Math.min(below, view.bottom - SAFE - bar.h),
  )
  return { x, y, where: 'free' }
}
