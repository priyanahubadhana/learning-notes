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

/** How close to a side of the page the pointer must be to dock there (px). */
export const ZONE = 64

/** The side whose drop zone holds the pointer, or null in the middle. */
export function zoneAt(p: { x: number; y: number }, a: Area): BarSide | null {
  const d: [BarSide, number][] = [
    ['top', p.y - a.top],
    ['bottom', a.bottom - p.y],
    ['left', p.x - a.left],
    ['right', a.right - p.x],
  ]
  const near = d.filter(([, n]) => n <= ZONE).sort((x, y) => x[1] - y[1])
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
