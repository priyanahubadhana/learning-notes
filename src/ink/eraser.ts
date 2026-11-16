import { createId } from '../core/ids'
import { STRIDE, type Stroke } from '../core/inkTypes'
import { distToSegment, type Pt } from './geometry'

/**
 * The eraser, as pure functions on a stroke's own units (page widths from
 * its block). The surface turns the eraser's path and size into the
 * stroke's units first.
 *
 * - precise: removes exactly what the eraser touched and splits the stroke
 *   in two (or more) pieces;
 * - standard: the same, but the eraser reaches a little further and tiny
 *   leftover specks are dropped;
 * - stroke: any touch removes the whole stroke.
 */
export type EraseMode = 'precise' | 'standard' | 'stroke'

/** Standard reaches this much further, and drops pieces shorter than this (x radius). */
const STANDARD_REACH = 1.35
const STANDARD_MIN_PIECE = 1.5

/** Distance from p to the eraser's path (a polyline or one point). */
export function distToPath(p: Pt, path: readonly Pt[]): number {
  if (path.length === 0) return Infinity
  if (path.length === 1) return Math.hypot(p.x - path[0].x, p.y - path[0].y)
  let best = Infinity
  for (let i = 1; i < path.length; i++) {
    best = Math.min(best, distToSegment(p, path[i - 1], path[i]))
  }
  return best
}

/** Points of a stroke with extra points added so none are further apart than `gap`. */
function densify(
  pts: readonly number[],
  gap: number,
  near?: (x: number, y: number, slack: number) => boolean,
): number[] {
  if (pts.length <= STRIDE) return pts.slice()
  const out: number[] = pts.slice(0, STRIDE)
  for (let i = STRIDE; i < pts.length; i += STRIDE) {
    const a = i - STRIDE
    const dx = pts[i] - pts[a]
    const dy = pts[i + 1] - pts[a + 1]
    const len = Math.hypot(dx, dy)
    // Far from the eraser a segment keeps its own points (nothing there is cut).
    const far =
      near && !near(pts[a], pts[a + 1], len) && !near(pts[i], pts[i + 1], len)
    const steps = far ? 1 : Math.min(64, Math.ceil(len / gap))
    for (let s = 1; s < steps; s++) {
      const k = s / steps
      for (let c = 0; c < STRIDE; c++) {
        out.push(pts[a + c] + (pts[i + c] - pts[a + c]) * k)
      }
    }
    for (let c = 0; c < STRIDE; c++) out.push(pts[i + c])
  }
  return out
}

/** Is a point within `reach` (plus a segment's own length) of the eraser's path? */
const nearPath =
  (path: readonly Pt[], reach: number) =>
  (x: number, y: number, slack: number): boolean =>
    distToPath({ x, y }, path) <= reach + slack

/**
 * C2: a snapped shape (rectangle, oval, triangle, line, arrow) as ordinary ink:
 * the same outline with a point at least every `gap`, and no shape or fill
 * mark. A shape is stored as a few corner points and drawn closed, so cutting
 * it as it is would join the leftover ends with a straight line.
 */
export function shapeToInk(
  stroke: Stroke,
  gap: number,
  near?: (x: number, y: number, slack: number) => boolean,
): Stroke {
  const { shape: _shape, fill: _fill, ...ink } = stroke
  void _shape
  void _fill
  return { ...ink, flat: true, pts: densify(stroke.pts, gap, near) }
}

/** Does any part of the stroke come within `radius` of the path? */
export function touches(
  stroke: Stroke,
  path: readonly Pt[],
  radius: number,
): boolean {
  const pts = densify(stroke.pts, Math.max(radius / 2, 1e-6))
  for (let i = 0; i < pts.length; i += STRIDE) {
    if (distToPath({ x: pts[i], y: pts[i + 1] }, path) <= radius) return true
  }
  return false
}

/** Does the path come within `radius` of the box a stroke's points fill? */
function touchesBox(
  stroke: Stroke,
  path: readonly Pt[],
  radius: number,
): boolean {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < stroke.pts.length; i += STRIDE) {
    x0 = Math.min(x0, stroke.pts[i])
    x1 = Math.max(x1, stroke.pts[i])
    y0 = Math.min(y0, stroke.pts[i + 1])
    y1 = Math.max(y1, stroke.pts[i + 1])
  }
  return path.some(
    (p) =>
      p.x >= x0 - radius &&
      p.x <= x1 + radius &&
      p.y >= y0 - radius &&
      p.y <= y1 + radius,
  )
}

/**
 * Erases with a round eraser of `radius` along `path`.
 * Returns the stroke unchanged (same object) when nothing was touched,
 * [] when nothing is left, or the pieces (new ids, same look and time).
 */
export function eraseStroke(
  stroke: Stroke,
  path: readonly Pt[],
  radius: number,
  mode: EraseMode,
): Stroke[] {
  if (mode === 'stroke') {
    return touches(stroke, path, radius) ? [] : [stroke]
  }
  // Tape is one piece: any touch inside or on it takes the whole tape off.
  if (stroke.kind === 'tape') {
    return touchesBox(stroke, path, radius) ? [] : [stroke]
  }
  const reach = mode === 'standard' ? radius * STANDARD_REACH : radius
  // Standard and Precise on a shape: it turns into ink where the tip touches
  // it, and the rest stays exactly where it was. Untouched, it stays a shape.
  if (stroke.shape) {
    if (!touches(stroke, path, reach)) return [stroke]
    return eraseStroke(
      shapeToInk(stroke, Math.max(reach / 2, 1e-6), nearPath(path, reach)),
      path,
      radius,
      mode,
    )
  }
  const pts = densify(
    stroke.pts,
    Math.max(reach / 2, 1e-6),
    stroke.flat ? nearPath(path, reach) : undefined,
  )
  const runs: number[][] = []
  let run: number[] = []
  let touched = false
  for (let i = 0; i < pts.length; i += STRIDE) {
    const hit = distToPath({ x: pts[i], y: pts[i + 1] }, path) <= reach
    if (hit) {
      touched = true
      if (run.length > 0) runs.push(run)
      run = []
    } else {
      for (let c = 0; c < STRIDE; c++) run.push(pts[i + c])
    }
  }
  if (!touched) return [stroke]
  if (run.length > 0) runs.push(run)
  // A closed shape (start = end) cut elsewhere: its start corner is in the
  // middle of the outline, so the last and first runs are one piece.
  const closed =
    stroke.flat === true &&
    pts.length > STRIDE &&
    pts[0] === pts[pts.length - STRIDE] &&
    pts[1] === pts[pts.length - STRIDE + 1]
  if (closed && runs.length > 1 && runs[0].length > 0) {
    const startsAtFirst = runs[0][0] === pts[0] && runs[0][1] === pts[1]
    const last = runs[runs.length - 1]
    const endsAtLast =
      last[last.length - STRIDE] === pts[pts.length - STRIDE] &&
      last[last.length - STRIDE + 1] === pts[pts.length - STRIDE + 1]
    if (startsAtFirst && endsAtLast) {
      runs[0] = [...last, ...runs[0].slice(STRIDE)]
      runs.pop()
    }
  }
  const minLen = mode === 'standard' ? radius * STANDARD_MIN_PIECE : 0
  const pieces: Stroke[] = []
  for (const r of runs) {
    const count = r.length / STRIDE
    // A one-point piece is a speck, unless the stroke was a dot to begin with.
    if (count < 2 && stroke.pts.length > STRIDE) continue
    if (minLen > 0 && lengthOf(r) < minLen) continue
    pieces.push({
      ...stroke,
      id: createId(),
      pts: stroke.flat ? r : r.map(trim),
    })
  }
  return pieces
}

const trim = (n: number): number => Math.round(n * 10000) / 10000

function lengthOf(pts: readonly number[]): number {
  let n = 0
  for (let i = STRIDE; i < pts.length; i += STRIDE) {
    n += Math.hypot(pts[i] - pts[i - STRIDE], pts[i + 1] - pts[i - STRIDE + 1])
  }
  return n
}
