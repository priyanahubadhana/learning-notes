import { memStore, prefStore } from './store'

/**
 * The floating bar ("Floating" position): a bar over the page that the user
 * drags by its ⠿ handle. Its place is saved per device as a fraction of the
 * room it has (0 = left or top edge, 1 = right or bottom edge), so after a
 * rotation or with the keyboard open it lands in the same relative spot, and
 * it is always clamped into the visible screen: it can never be off-screen.
 */

export interface FreePos {
  fx: number
  fy: number
}

const inUnit = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1

/** An unreadable or out-of-range saved place reads as the default. */
export const isFreePos = (v: unknown): v is FreePos =>
  typeof v === 'object' &&
  v !== null &&
  inUnit((v as FreePos).fx) &&
  inUnit((v as FreePos).fy)

/** Centred, just above the bottom edge. */
export const DEFAULT_FREE_POS: FreePos = { fx: 0.5, fy: 0.97 }

export const freePos = prefStore<FreePos>(
  'toolbar.freePos',
  isFreePos,
  DEFAULT_FREE_POS,
)

/** The ribbon's own place, when only the ribbon floats. */
export const ribbonFreePos = prefStore<FreePos>(
  'toolbar.ribbonFreePos',
  isFreePos,
  { fx: 0.5, fy: 0.9 },
)

/** True right after "Floating" was chosen: the "Drag ⠿ to move it" tip. */
export const freeTip = memStore(false)

export const resetFreePos = () => {
  freePos.set({ ...DEFAULT_FREE_POS })
  ribbonFreePos.set({ fx: 0.5, fy: 0.9 })
}

export interface Box {
  left: number
  top: number
  width: number
  height: number
}
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/** Space kept free around the bar (px). */
export const EDGE_MARGIN = 8
/** Dropping the bar this close to an edge snaps it to the edge (px). */
export const SNAP_PX = 24

/** The rectangle the bar's top-left corner may be in. */
export function room(
  bar: { width: number; height: number },
  view: Box,
  insets: Insets,
): Box {
  const left = view.left + insets.left + EDGE_MARGIN
  const top = view.top + insets.top + EDGE_MARGIN
  const right = view.left + view.width - insets.right - EDGE_MARGIN - bar.width
  const bottom =
    view.top + view.height - insets.bottom - EDGE_MARGIN - bar.height
  // A bar bigger than the screen sticks to the top-left corner.
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

/** Where the bar's top-left corner goes for a saved place. */
export function placeBar(
  pos: FreePos,
  bar: { width: number; height: number },
  view: Box,
  insets: Insets,
): { x: number; y: number } {
  const r = room(bar, view, insets)
  return { x: r.left + pos.fx * r.width, y: r.top + pos.fy * r.height }
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/** The saved place for a dropped corner: clamped, snapped to edges. */
export function posFromPixels(
  x: number,
  y: number,
  bar: { width: number; height: number },
  view: Box,
  insets: Insets,
): FreePos {
  const r = room(bar, view, insets)
  const snap = (v: number, min: number, size: number) => {
    const c = clamp(v, min, min + size)
    if (c - min < SNAP_PX) return min
    if (min + size - c < SNAP_PX) return min + size
    return c
  }
  const nx = snap(x, r.left, r.width)
  const ny = snap(y, r.top, r.height)
  return {
    fx: r.width > 0 ? (nx - r.left) / r.width : 0,
    fy: r.height > 0 ? (ny - r.top) / r.height : 0,
  }
}

/** The visible screen in layout-viewport coordinates (keyboard, zoom). */
export function visibleBox(): Box {
  const vv = window.visualViewport
  return vv
    ? {
        left: vv.offsetLeft,
        top: vv.offsetTop,
        width: vv.width,
        height: vv.height,
      }
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
}
