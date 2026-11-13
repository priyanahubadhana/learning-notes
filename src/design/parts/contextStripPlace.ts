import type { Rect } from '../../app/overlay'

/** Least distance from every screen edge, and the gap to the selection. */
export const STRIP_MARGIN = 12
export const STRIP_GAP = 8
/** Under this width the strip is the phone shape: 4 items and "⋯". */
export const STRIP_PHONE_MAX = 600
export const STRIP_MAX_PHONE_ITEMS = 4

export type StripSide = 'above' | 'below' | 'right' | 'left' | 'over'

export interface StripPlacement {
  left: number
  top: number
  side: StripSide
  /** Arrow centre from the strip's left edge; null beside or over. */
  arrowX: number | null
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

/** The smallest rect holding the selection and everything else to keep clear. */
export function unionRect(target: Rect, avoid: readonly Rect[] = []): Rect {
  let l = target.left
  let t = target.top
  let r = target.left + target.width
  let b = target.top + target.height
  for (const a of avoid) {
    l = Math.min(l, a.left)
    t = Math.min(t, a.top)
    r = Math.max(r, a.left + a.width)
    b = Math.max(b, a.top + a.height)
  }
  return { left: l, top: t, width: r - l, height: b - t }
}

/**
 * Where the strip (or the Command list opened from it) goes: above the
 * selection, else below, else beside it (right, then left). `avoid` holds
 * rects to keep clear too (selection handles, the B / I / U bar). The result
 * is always at least 12 px inside the screen; only when nothing fits does it
 * sit over the selection ("over"), clamped on screen.
 */
export function placeStrip(
  target: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number; left?: number },
  avoid: readonly Rect[] = [],
): StripPlacement {
  const u = unionRect(target, avoid)
  const { width: w, height: h } = size
  const m = STRIP_MARGIN
  const minX = (viewport.left ?? 0) + m
  const maxX = (viewport.left ?? 0) + viewport.width - m
  const maxLeft = Math.max(minX, maxX - w)
  const maxTop = Math.max(m, viewport.height - h - m)
  const uRight = u.left + u.width
  const uBottom = u.top + u.height
  const pointX = target.left + target.width / 2
  const centreLeft = clamp(u.left + u.width / 2 - w / 2, minX, maxLeft)
  const arrow = (left: number) => clamp(pointX - left, 20, Math.max(20, w - 20))

  const aboveTop = u.top - STRIP_GAP - h
  if (aboveTop >= m)
    return {
      left: centreLeft,
      top: aboveTop,
      side: 'above',
      arrowX: arrow(centreLeft),
    }
  const belowTop = uBottom + STRIP_GAP
  if (belowTop + h <= viewport.height - m)
    return {
      left: centreLeft,
      top: belowTop,
      side: 'below',
      arrowX: arrow(centreLeft),
    }
  const midTop = clamp(u.top + u.height / 2 - h / 2, m, maxTop)
  const rightLeft = uRight + STRIP_GAP
  if (rightLeft + w <= maxX)
    return { left: rightLeft, top: midTop, side: 'right', arrowX: null }
  const leftLeft = u.left - STRIP_GAP - w
  if (leftLeft >= minX)
    return { left: leftLeft, top: midTop, side: 'left', arrowX: null }
  return {
    left: centreLeft,
    top: clamp(aboveTop, m, maxTop),
    side: 'over',
    arrowX: null,
  }
}

export interface SplitItem {
  id: string
  label: string
  danger?: boolean
  menu?: unknown
}

/** A rough width of one labelled strip item (icon, name, ▾ when it has a menu). */
export const itemWidth = (i: SplitItem): number =>
  24 + 18 + 6 + Math.ceil(i.label.length * 7.4) + (i.menu ? 18 : 0)

/**
 * Which items stay on the strip and which fold into "⋯". Delete (the first
 * danger item) always stays, last. Phone: at most 4 items. Wider: as many as
 * fit in `maxWidth`, dropped from the end (before Delete).
 */
export function splitStripItems<T extends SplitItem>(
  items: readonly T[],
  opts: { phone: boolean; maxWidth: number; hasExtra: boolean },
): { shown: T[]; overflow: T[]; showMore: boolean } {
  const danger = items.filter((i) => i.danger).slice(0, 1)
  const plain = items.filter((i) => !danger.includes(i))
  const sum = (list: readonly T[]) => list.reduce((s, i) => s + itemWidth(i), 0)
  let keep: number
  if (opts.phone) {
    keep = Math.max(0, STRIP_MAX_PHONE_ITEMS - danger.length)
  } else if (
    items.length === plain.length + danger.length &&
    8 + sum(plain) + sum(danger) + (opts.hasExtra ? 48 : 0) <= opts.maxWidth
  ) {
    keep = plain.length
  } else {
    let used = 8 + 48 + sum(danger)
    keep = 0
    for (const i of plain) {
      used += itemWidth(i)
      if (used > opts.maxWidth) break
      keep += 1
    }
  }
  const shown = [...plain.slice(0, keep), ...danger]
  const overflow = [
    ...plain.slice(keep),
    ...items.filter((i) => i.danger && !danger.includes(i)),
  ]
  return { shown, overflow, showMore: overflow.length > 0 || opts.hasExtra }
}
