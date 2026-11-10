import { prefStore } from '../store'

/**
 * The selection mini bar: 📌 keeps it where the person dragged it (instead of
 * following each new selection), and that place is remembered per device.
 * The mini keyboard strip's place and visibility are kept here too.
 */

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'

export interface FreePos {
  left: number
  top: number
}
export const isFreePos = (v: unknown): v is FreePos | null => {
  if (v === null) return true
  if (typeof v !== 'object' || Array.isArray(v)) return false
  const p = v as Record<string, unknown>
  return Number.isFinite(p.left) && Number.isFinite(p.top)
}

export const miniPinned = prefStore('toolbar.miniPinned', isBoolean, false)
export const miniPos = prefStore<FreePos | null>(
  'toolbar.miniPos',
  isFreePos,
  null,
)

/** The micro text bar's dragged place (null = beside the box), per device. */
export const microPos = prefStore<FreePos | null>(
  'toolbar.microPos',
  isFreePos,
  null,
)

/** A box on the screen: the page area the mini bar must stay inside. */
export interface Area {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Keeps a box (its centre x, its top y) fully inside `area` on all four
 * edges, with an 8 px gap (R7-7). A box wider or taller than the area sticks
 * to its left or top edge.
 */
export function clampInArea(
  p: FreePos,
  size: { width: number; height: number },
  area: Area,
): FreePos {
  const half = Math.min(size.width, area.right - area.left - 16) / 2
  return {
    left: Math.max(
      area.left + 8 + half,
      Math.min(area.right - 8 - half, p.left),
    ),
    top: Math.max(area.top + 8, Math.min(area.bottom - 8 - size.height, p.top)),
  }
}

/** Keeps a dragged box (its centre x, its top y) fully on the screen. */
export function clampPos(
  p: FreePos,
  size: { width: number; height: number },
  screen: { width: number; height: number },
): FreePos {
  return clampInArea(p, size, {
    left: 0,
    top: 0,
    right: screen.width,
    bottom: screen.height,
  })
}

/**
 * The page area: the page (`main`) on the screen, so the bar never sits over
 * the sidebar or under the tool bar. The whole screen if there is no page.
 */
export function pageArea(
  doc: Document = document,
  screen: { width: number; height: number } = {
    width: window.innerWidth,
    height: window.innerHeight,
  },
): Area {
  const box = doc.querySelector('main')?.getBoundingClientRect()
  const area: Area = {
    left: Math.max(0, box?.left ?? 0),
    top: Math.max(0, box?.top ?? 0),
    right: Math.min(screen.width, box?.right ?? screen.width),
    bottom: Math.min(screen.height, box?.bottom ?? screen.height),
  }
  // A page that is hidden or empty (zero size): the screen.
  return area.right - area.left < 120 || area.bottom - area.top < 80
    ? { left: 0, top: 0, right: screen.width, bottom: screen.height }
    : area
}

/** Whether the bar must be placed again: a new selection, not a format change. */
export function isNewSelection(
  prev: { from: number; to: number; doc: unknown; text: string } | null,
  now: { from: number; to: number; doc: unknown; text: string },
): boolean {
  if (!prev) return true
  if (prev.doc === now.doc) return prev.from !== now.from || prev.to !== now.to
  // The document changed (a format): same words = the same selection.
  return prev.text !== now.text
}
