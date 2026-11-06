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

/** Keeps a dragged box (its centre x, its top y) fully on the screen. */
export function clampPos(
  p: FreePos,
  size: { width: number; height: number },
  screen: { width: number; height: number },
): FreePos {
  const half = Math.min(size.width, screen.width - 16) / 2
  return {
    left: Math.min(screen.width - 8 - half, Math.max(8 + half, p.left)),
    top: Math.min(screen.height - 8 - size.height, Math.max(8, p.top)),
  }
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
