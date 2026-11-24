/**
 * Where the one bar of a box can stand when the person moves, docks or pins it
 * (box bar part B). Pure, so it is tested without a browser. Screen px.
 */
export type BarSide = 'free' | 'top' | 'bottom' | 'left' | 'right'

/** A kept place: a side (or a free spot, the bar's top-left) and whether it is pinned. */
export interface BarPlace {
  side: BarSide
  left: number
  top: number
  pinned: boolean
}

export interface Area {
  left: number
  top: number
  right: number
  bottom: number
}

const SIDES: readonly BarSide[] = ['free', 'top', 'bottom', 'left', 'right']

/** A saved place, or null for anything that is not one. */
export function cleanBarPlace(v: unknown): BarPlace | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  if (!SIDES.includes(o.side as BarSide)) return null
  if (!Number.isFinite(o.left) || !Number.isFinite(o.top)) return null
  return {
    side: o.side as BarSide,
    left: Number(o.left),
    top: Number(o.top),
    pinned: o.pinned === true,
  }
}

/** How close to the top or bottom of the page the pointer must be to dock there (px). */
export const ZONE = 64
/**
 * The same for the left and right sides: wider, because a finger stopping at the
 * very edge of an iPad is taken by the system (the touch is cancelled) and the
 * drop would be lost (issue #61).
 */
export const ZONE_SIDE = 96

/** The side whose drop zone holds the pointer, or null in the middle. */
export function zoneAt(p: { x: number; y: number }, a: Area): BarSide | null {
  const d: [BarSide, number][] = [
    ['top', p.y - a.top],
    ['bottom', a.bottom - p.y],
    ['left', p.x - a.left],
    ['right', a.right - p.x],
  ]
  const near = d
    .filter(
      ([side, n]) =>
        n <= (side === 'left' || side === 'right' ? ZONE_SIDE : ZONE),
    )
    .sort((x, y) => x[1] - y[1])
  return near.length ? near[0][0] : null
}

/** What a drop makes of the bar: docked on a side, or a free place. */
export function placeAfterDrop(
  pointer: { x: number; y: number },
  free: { left: number; top: number },
  a: Area,
): Pick<BarPlace, 'side' | 'left' | 'top'> {
  const side = zoneAt(pointer, a)
  return { side: side ?? 'free', left: free.left, top: free.top }
}

const GAP = 8

/**
 * The CSS of a docked bar (position: fixed): lying flat and centred on the top
 * and bottom, upright and centred on the left and right.
 */
export function dockStyle(
  side: Exclude<BarSide, 'free'>,
  a: Area,
  screen: { width: number; height: number } = {
    width: typeof innerWidth === 'number' ? innerWidth : 1000,
    height: typeof innerHeight === 'number' ? innerHeight : 800,
  },
): { vertical: boolean; css: Record<string, number | string> } {
  const midX = (a.left + a.right) / 2
  const midY = (a.top + a.bottom) / 2
  switch (side) {
    case 'top':
      return {
        vertical: false,
        css: { top: a.top + GAP, left: midX, transform: 'translateX(-50%)' },
      }
    case 'bottom':
      return {
        vertical: false,
        css: {
          bottom: screen.height - a.bottom + GAP,
          left: midX,
          transform: 'translateX(-50%)',
        },
      }
    case 'left':
      return {
        vertical: true,
        css: { left: a.left + GAP, top: midY, transform: 'translateY(-50%)' },
      }
    default:
      return {
        vertical: true,
        css: {
          right: screen.width - a.right + GAP,
          top: midY,
          transform: 'translateY(-50%)',
        },
      }
  }
}

const EDGE = 8

/**
 * The area less every panel that lies over it (issue #60): a panel on the left
 * side takes the left, one on the right the right. A panel that covers most of
 * the width is a sheet, not a side panel, and is left alone.
 */
export function cutByPanels(a: Area, panels: readonly Area[]): Area {
  const out = { ...a }
  const width = a.right - a.left
  const mid = (a.left + a.right) / 2
  for (const p of panels) {
    if (p.right <= out.left || p.left >= out.right) continue
    if (p.bottom <= a.top || p.top >= a.bottom) continue
    if (p.right - p.left > width * 0.7) continue
    if ((p.left + p.right) / 2 < mid) out.left = Math.max(out.left, p.right)
    else out.right = Math.min(out.right, p.left)
  }
  return out
}

/** Does a bar of this size have room in the area? If not, a pinned bar folds. */
export function barFits(a: Area, size: { w: number; h: number }): boolean {
  return (
    a.right - a.left >= size.w + 2 * EDGE &&
    a.bottom - a.top >= size.h + 2 * EDGE
  )
}

/** A free place kept inside the area. */
export function clampFree(
  p: { left: number; top: number },
  a: Area,
  size: { w: number; h: number },
): { left: number; top: number } {
  return {
    left: Math.max(a.left + EDGE, Math.min(p.left, a.right - EDGE - size.w)),
    top: Math.max(a.top + EDGE, Math.min(p.top, a.bottom - EDGE - size.h)),
  }
}

/** A touch that moves less than this (px) is a tap on the grip, not a drag. */
export const TAP_SLOP = 8

/** The page stays shielded this long after the grip is let go (ms): the click
 * an iPad sends after a touch must not land on the words under the bar. */
export const HOLD_AFTER_MS = 450

export function isTap(
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) < TAP_SLOP
}

/** A bar this close (px) to the area's edge is held against it (free() stops it at 8). */
const HELD = 10
/** The travel (px) toward a side that makes a held bar mean that side (#61). */
export const PUSH = 24
/** The travel (px) toward a left or right zone that lets the pointer alone choose it. */
export const SIDE_TRAVEL = 40

/**
 * The side a bar being dragged would dock on (issue #61). A bar almost as wide
 * as the page is held by its left-end grip, so the finger never gets near the
 * right edge. A side wins when the bar is HELD against that edge (the clamp
 * stopped it), the pointer has travelled at least PUSH toward it since the
 * press AND the pointer is itself in some side zone (it may be the wrong one: the
 * grip of a page-wide bar). Otherwise the pointer decides (zoneAt), as before.
 * `travel` is how far the pointer has moved since the press.
 */
export function zoneForBar(
  bar: Area,
  travel: { x: number; y: number },
  a: Area,
  pointer?: { x: number; y: number },
): BarSide | null {
  const pushed: [BarSide, number][] = [
    ['right', a.right - bar.right <= HELD ? travel.x : 0],
    ['left', bar.left - a.left <= HELD ? -travel.x : 0],
    ['bottom', a.bottom - bar.bottom <= HELD ? travel.y : 0],
    ['top', bar.top - a.top <= HELD ? -travel.y : 0],
  ]
  const win = pushed.filter(([, n]) => n >= PUSH).sort((x, y) => y[1] - x[1])[0]
  const raw = pointer ? zoneAt(pointer, a) : null
  let at = raw
  // A left or right zone from the pointer alone needs SIDE_TRAVEL toward it: the
  // grip of a page-wide bar always sits in the left zone, and a vertical drag
  // must still drop free. Top and bottom stay as they were.
  if (
    pointer &&
    ((at === 'left' && -travel.x < SIDE_TRAVEL) ||
      (at === 'right' && travel.x < SIDE_TRAVEL))
  )
    at = zoneAt(pointer, { ...a, left: -1e6, right: 1e6 })
  // The finger in the middle of the page is a free drop (a bar held at the edge
  // by its clamp is then only where the finger dragged it); the finger in a side
  // zone that is not the pushed side is the #61 case: the push decides.
  if (win && (!pointer || raw)) return win[0]
  return at
}
