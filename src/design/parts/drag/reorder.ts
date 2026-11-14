/** Pure maths for reordering (SP-06). No DOM: everything here is unit tested. */

/** D9: a grip starts a drag after this many px of movement. */
export const GRIP_SLOP = 4
/** D9: a whole row lifts after this long a hold (touch / pen). */
export const HOLD_MS = 300
/** D9: moving further than this before the hold ends cancels it (the page scrolls). */
export const HOLD_CANCEL = 8
/** The gesture ends by itself this long after the last pointer event. */
export const LOST_MS = 4000

export interface Point {
  x: number
  y: number
}

export type Axis = 'y' | 'x' | 'grid'

/** `ids` with the item at `from` moved so it ends up at index `to`. */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  if (from < 0 || from >= items.length) return [...items]
  const clamped = Math.max(0, Math.min(items.length - 1, to))
  const next = [...items]
  const [it] = next.splice(from, 1)
  next.splice(clamped, 0, it)
  return next
}

/**
 * Where a dragged item would land among the OTHER items.
 * `centres` are the centres of the others in their current order;
 * `p` is the centre of the dragged item. Result: 0..centres.length.
 */
export function targetIndex(
  centres: readonly Point[],
  p: Point,
  axis: Axis,
): number {
  if (!centres.length) return 0
  if (axis === 'y') return centres.filter((c) => c.y < p.y).length
  if (axis === 'x') return centres.filter((c) => c.x < p.x).length
  // grid: the nearest item decides; before it when we are on its start side.
  let best = 0
  let bestD = Infinity
  centres.forEach((c, i) => {
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  const c = centres[best]
  const sameRow = Math.abs(c.y - p.y) < Math.abs(c.x - p.x) * 2 + 1
  const after = sameRow ? p.x > c.x : p.y > c.y
  return best + (after ? 1 : 0)
}

/**
 * Snaps `index` (0..count-1) to the nearest slot where `fit(slot)` is true.
 * Ties go to the earlier slot. Returns -1 when no slot fits.
 */
export function snapToFit(
  index: number,
  count: number,
  fit?: (slot: number) => boolean,
): number {
  if (count <= 0) return -1
  const start = Math.max(0, Math.min(count - 1, index))
  if (!fit || fit(start)) return start
  for (let d = 1; d < count; d++) {
    if (start - d >= 0 && fit(start - d)) return start - d
    if (start + d < count && fit(start + d)) return start + d
  }
  return -1
}

/**
 * A flow grid of `cols` columns. Each item has a span (1 = small, 2+ = wide).
 * An item that does not fit the rest of its row wraps to the next row.
 */
export interface Placement {
  row: number
  col: number
  span: number
}
export function layoutGrid(
  spans: readonly number[],
  cols: number,
): Placement[] {
  const out: Placement[] = []
  let row = 0
  let col = 0
  for (const raw of spans) {
    const span = Math.max(1, Math.min(cols, raw))
    if (col + span > cols) {
      row++
      col = 0
    }
    out.push({ row, col, span })
    col += span
    if (col >= cols) {
      row++
      col = 0
    }
  }
  return out
}

/** True when the item at `slot` in the final order leaves no gap in its row (a wide item never fits a half row). */
export function fitsWithoutGap(
  spans: readonly number[],
  slot: number,
  cols: number,
): boolean {
  const p = layoutGrid(spans, cols)[slot]
  if (!p) return false
  // The item must start where the previous one ended (no hole before it).
  if (slot === 0) return p.col === 0
  const prev = layoutGrid(spans, cols)[slot - 1]
  const prevEnd = prev.col + prev.span
  const expected = prevEnd >= cols ? 0 : prevEnd
  return p.col === expected && (p.row === prev.row || prevEnd >= cols)
}

export type MoveKey = 'up' | 'down' | 'start' | 'end'

/** Index after a keyboard / button move, or -1 when the item cannot move that way. */
export function keyTarget(index: number, count: number, key: MoveKey): number {
  const to =
    key === 'up'
      ? index - 1
      : key === 'down'
        ? index + 1
        : key === 'start'
          ? 0
          : count - 1
  return to < 0 || to >= count || to === index ? -1 : to
}

/** Alt+arrow / Alt+Home / Alt+End → MoveKey for an axis, else null. */
export function keyToMove(key: string, axis: Axis): MoveKey | null {
  if (key === 'Home') return 'start'
  if (key === 'End') return 'end'
  if (key === 'ArrowUp' && axis !== 'x') return 'up'
  if (key === 'ArrowDown' && axis !== 'x') return 'down'
  if (key === 'ArrowLeft' && axis !== 'y') return 'up'
  if (key === 'ArrowRight' && axis !== 'y') return 'down'
  return null
}

/** Next fitting slot in a direction (keyboard in a grid), or -1. */
export function nextFit(
  from: number,
  dir: 1 | -1,
  count: number,
  fit?: (slot: number) => boolean,
): number {
  for (let i = from + dir; i >= 0 && i < count; i += dir) {
    if (!fit || fit(i)) return i
  }
  return -1
}

export type StartMode = 'immediate' | 'hold'

/** D9: how a press starts a drag. Grip = after 4 px; row = long hold on touch / pen, 4 px on a mouse. */
export function startMode(
  handle: 'grip' | 'row',
  pointerType: string,
): StartMode {
  return handle === 'row' && pointerType !== 'mouse' ? 'hold' : 'immediate'
}

/** What a move of `dist` px does to a press that has not lifted yet. */
export function pressMove(
  mode: StartMode,
  dist: number,
): 'wait' | 'lift' | 'cancel' {
  if (mode === 'immediate') return dist >= GRIP_SLOP ? 'lift' : 'wait'
  return dist > HOLD_CANCEL ? 'cancel' : 'wait'
}
