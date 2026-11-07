import { prefStore } from '../store'

/**
 * Where the options pill sits: on one of the four edges of the room it has,
 * and how far along that edge (0 = start, 1 = end). The maths here is pure
 * (tested); OptionsPill.tsx measures the room and moves the pill.
 */

const EDGES = ['top', 'bottom', 'left', 'right'] as const
export type Edge = (typeof EDGES)[number]
const isEdge = (v: unknown): v is Edge =>
  (EDGES as readonly unknown[]).includes(v)

export interface PillPlace {
  edge: Edge
  /** 0 to 1 along the edge. */
  along: number
}

export const isPillPlace = (v: unknown): v is PillPlace | null => {
  if (v === null) return true
  if (typeof v !== 'object' || Array.isArray(v)) return false
  const p = v as Record<string, unknown>
  return (
    isEdge(p.edge) &&
    typeof p.along === 'number' &&
    p.along >= 0 &&
    p.along <= 1
  )
}

/** Saved per device; null = the default (next to the main bar). */
export const pillPlaceStore = prefStore<PillPlace | null>(
  'toolbar.pillPlace',
  isPillPlace,
  null,
)

export const vertical = (edge: Edge): boolean =>
  edge === 'left' || edge === 'right'

export interface Box {
  left: number
  top: number
  width: number
  height: number
}
export interface Size {
  width: number
  height: number
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** The place used when none is saved: just under (or over) the main bar. */
export const defaultPlace = (barAtBottom: boolean): PillPlace => ({
  edge: barAtBottom ? 'bottom' : 'top',
  along: 0.5,
})

/** Top-left corner of a pill of `size` at `place` inside `box`. */
export function positionOf(
  place: PillPlace,
  size: Size,
  box: Box,
): { x: number; y: number } {
  const room = (total: number, own: number) => Math.max(0, total - own)
  const along = clamp01(place.along)
  switch (place.edge) {
    case 'top':
      return { x: box.left + room(box.width, size.width) * along, y: box.top }
    case 'bottom':
      return {
        x: box.left + room(box.width, size.width) * along,
        y: box.top + room(box.height, size.height),
      }
    case 'left':
      return { x: box.left, y: box.top + room(box.height, size.height) * along }
    case 'right':
      return {
        x: box.left + room(box.width, size.width),
        y: box.top + room(box.height, size.height) * along,
      }
  }
}

/** Which edge a pill with its top-left at (x, y) is closest to (side to side). */
export function nearestEdge(x: number, y: number, size: Size, box: Box): Edge {
  const distance: Record<Edge, number> = {
    top: Math.abs(y - box.top),
    bottom: Math.abs(box.top + box.height - (y + size.height)),
    left: Math.abs(x - box.left),
    right: Math.abs(box.left + box.width - (x + size.width)),
  }
  return EDGES.reduce((best, edge) =>
    distance[edge] < distance[best] ? edge : best,
  )
}

/** The place a pill dropped with its top-left at (x, y) snaps to. */
export function snapPlace(
  x: number,
  y: number,
  size: Size,
  box: Box,
): PillPlace {
  const edge = nearestEdge(x, y, size, box)
  const room = (total: number, own: number) => Math.max(1, total - own)
  const along = vertical(edge)
    ? (y - box.top) / room(box.height, size.height)
    : (x - box.left) / room(box.width, size.width)
  return { edge, along: clamp01(along) }
}

/** The drop zones shown while dragging: a strip along each edge. */
export function dropZones(box: Box, thickness = 56): Record<Edge, Box> {
  return {
    top: { left: box.left, top: box.top, width: box.width, height: thickness },
    bottom: {
      left: box.left,
      top: box.top + box.height - thickness,
      width: box.width,
      height: thickness,
    },
    left: {
      left: box.left,
      top: box.top,
      width: thickness,
      height: box.height,
    },
    right: {
      left: box.left + box.width - thickness,
      top: box.top,
      width: thickness,
      height: box.height,
    },
  }
}

/** Keeps a dragged pill's top-left inside the box. */
export function clampInside(
  x: number,
  y: number,
  size: Size,
  box: Box,
): { x: number; y: number } {
  return {
    x: Math.min(
      box.left + Math.max(0, box.width - size.width),
      Math.max(box.left, x),
    ),
    y: Math.min(
      box.top + Math.max(0, box.height - size.height),
      Math.max(box.top, y),
    ),
  }
}

/** Arrow keys move the pill along its edge, or to the next edge. */
export function nudgePlace(
  place: PillPlace,
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
  step = 0.1,
): PillPlace {
  const v = vertical(place.edge)
  const along = place.along
  if (v && key === 'ArrowUp') return { ...place, along: clamp01(along - step) }
  if (v && key === 'ArrowDown')
    return { ...place, along: clamp01(along + step) }
  if (!v && key === 'ArrowLeft')
    return { ...place, along: clamp01(along - step) }
  if (!v && key === 'ArrowRight')
    return { ...place, along: clamp01(along + step) }
  // The other arrows move across to another edge.
  const edge: Edge =
    key === 'ArrowUp'
      ? 'top'
      : key === 'ArrowDown'
        ? 'bottom'
        : key === 'ArrowLeft'
          ? 'left'
          : 'right'
  return { edge, along }
}

/** The CSS place of a detail card next to its pill (all in screen pixels). */
export interface CardAnchor {
  left: number
  top?: number
  bottom?: number
  maxHeight: number
}

const CARD_WIDTH = 340
const GAP = 6
const EDGE_GAP = 8

/**
 * Where the card goes: below a top pill, above a bottom pill, beside a side
 * pill (on the side with room), always inside the screen.
 */
export function cardAnchor(
  pos: { x: number; y: number },
  size: Size,
  edge: Edge,
  screen: Size,
): CardAnchor {
  const width = Math.min(CARD_WIDTH, screen.width - 2 * EDGE_GAP)
  const clampX = (x: number) =>
    Math.min(screen.width - width - EDGE_GAP, Math.max(EDGE_GAP, x))
  switch (edge) {
    case 'top': {
      const top = pos.y + size.height + GAP
      return {
        left: clampX(pos.x),
        top,
        maxHeight: Math.max(160, screen.height - top - EDGE_GAP),
      }
    }
    case 'bottom': {
      const bottom = screen.height - pos.y + GAP
      return {
        left: clampX(pos.x),
        bottom,
        maxHeight: Math.max(160, pos.y - GAP - EDGE_GAP),
      }
    }
    default: {
      const top = Math.min(
        Math.max(EDGE_GAP, pos.y),
        Math.max(EDGE_GAP, screen.height - 200),
      )
      return {
        left:
          edge === 'left'
            ? clampX(pos.x + size.width + GAP)
            : clampX(pos.x - width - GAP),
        top,
        maxHeight: Math.max(160, screen.height - top - EDGE_GAP),
      }
    }
  }
}
