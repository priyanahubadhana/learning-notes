import type { ShapeKind } from '../core/inkTypes'
import {
  boundsOf,
  dist,
  distToSegment,
  inPolygon,
  pathLength,
  simplify,
  type Pt,
} from './geometry'

/**
 * Shape recognition for "draw and hold": the pen is held still at the end
 * of a stroke and the stroke becomes a clean line, rectangle, circle or
 * ellipse, triangle or arrow. Also the two quick pen gestures: scribble
 * (to erase) and circle (to lasso). Works on page px; no DOM.
 */

export interface Recognised {
  kind: ShapeKind
  /** The clean outline (closed shapes repeat the first point at the end). */
  pts: Pt[]
  closed: boolean
}

export interface ShapeOptions {
  /** Snap lines to 0, 45 or 90 degrees, rectangles to squares, ellipses to circles. */
  snap: boolean
}

const diag = (b: { w: number; h: number }) => Math.hypot(b.w, b.h)

/** Is the stroke closed (its end near its start)? */
function isClosed(pts: readonly Pt[]): boolean {
  const b = boundsOf(pts)
  const gap = dist(pts[0], pts[pts.length - 1])
  return gap < Math.max(10, diag(b) * 0.22)
}

function ellipsePoints(c: Pt, rx: number, ry: number, steps = 72): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    out.push({ x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry })
  }
  return out
}

/** Snaps the direction of a line to the nearest 45 degrees when within 8 degrees. */
export function snapLine(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return b
  const angle = Math.atan2(dy, dx)
  const step = Math.PI / 4
  const near = Math.round(angle / step) * step
  if (Math.abs(angle - near) > (8 * Math.PI) / 180) return b
  return { x: a.x + Math.cos(near) * len, y: a.y + Math.sin(near) * len }
}

function asLine(pts: Pt[], snap: boolean): Recognised | null {
  const a = pts[0]
  let b = pts[pts.length - 1]
  const len = dist(a, b)
  if (len < 24) return null
  // Every point lies close to the chord.
  const worst = Math.max(...pts.map((p) => distToSegment(p, a, b)))
  if (worst > Math.max(5, len * 0.07)) return null
  if (snap) b = snapLine(a, b)
  return { kind: 'line', pts: [a, b], closed: false }
}

function asArrow(pts: Pt[], snap: boolean): Recognised | null {
  // The longest straight run first, then a short two-stroke head.
  const total = pathLength(pts)
  if (total < 60) return null
  let far = 0
  for (const p of pts) far = Math.max(far, dist(pts[0], p))
  // The tip is the first point that gets (nearly) as far as the farthest.
  const tipIndex = pts.findIndex((p) => dist(pts[0], p) >= far * 0.97)
  if (tipIndex < 2 || tipIndex > pts.length - 4) return null
  const shaft = pts.slice(0, tipIndex + 1)
  const head = pts.slice(tipIndex)
  const a = pts[0]
  let tip = pts[tipIndex]
  const worst = Math.max(...shaft.map((p) => distToSegment(p, a, tip)))
  if (worst > Math.max(6, far * 0.1)) return null
  // The head wanders back: it must be short and stay near the tip.
  if (pathLength(head) < far * 0.2 || pathLength(head) > far * 1.2) return null
  const reach = Math.max(...head.map((p) => dist(p, tip)))
  if (reach < far * 0.1 || reach > far * 0.5) return null
  if (snap) tip = snapLine(a, tip)
  const dir = Math.atan2(tip.y - a.y, tip.x - a.x)
  const size = Math.min(far * 0.28, Math.max(14, reach))
  const barb = (sign: number): Pt => ({
    x: tip.x - Math.cos(dir + sign * 0.55) * size,
    y: tip.y - Math.sin(dir + sign * 0.55) * size,
  })
  return {
    kind: 'arrow',
    pts: [a, tip, barb(1), tip, barb(-1)],
    closed: false,
  }
}

function corners(pts: Pt[]): Pt[] {
  const b = boundsOf(pts)
  const eps = Math.max(6, diag(b) * 0.07)
  // Open the loop where it was closed, then simplify.
  const poly = simplify(pts, eps)
  if (poly.length > 2 && dist(poly[0], poly[poly.length - 1]) < eps * 3) {
    poly.pop()
  }
  return poly
}

function asClosed(pts: Pt[], snap: boolean): Recognised | null {
  const b = boundsOf(pts)
  if (b.w < 18 || b.h < 18) return null
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const poly = corners(pts)

  if (poly.length === 3) {
    return { kind: 'triangle', pts: [...poly, poly[0]], closed: true }
  }
  if (poly.length === 4) {
    // Rectangle: near-right angles. (A diamond is kept as drawn.)
    const sq = poly.every((p, i) => {
      const prev = poly[(i + 3) % 4]
      const next = poly[(i + 1) % 4]
      const v1 = { x: prev.x - p.x, y: prev.y - p.y }
      const v2 = { x: next.x - p.x, y: next.y - p.y }
      const cos =
        (v1.x * v2.x + v1.y * v2.y) /
        (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1)
      return Math.abs(cos) < 0.42
    })
    if (sq) {
      let { x, y, w, h } = b
      if (snap && Math.abs(w - h) < Math.max(w, h) * 0.12) {
        const s = (w + h) / 2
        x = c.x - s / 2
        y = c.y - s / 2
        w = h = s
      }
      const r = [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ]
      return { kind: 'rect', pts: [...r, r[0]], closed: true }
    }
    return { kind: 'triangle', pts: [...poly, poly[0]], closed: true }
  }
  // Round? Points lie near an ellipse around the middle.
  let rx = b.w / 2
  let ry = b.h / 2
  const errs = pts.map((p) => {
    const nx = (p.x - c.x) / rx
    const ny = (p.y - c.y) / ry
    return Math.abs(Math.hypot(nx, ny) - 1)
  })
  const mean = errs.reduce((a, e) => a + e, 0) / errs.length
  if (mean > 0.17) return null
  if (snap && Math.abs(rx - ry) < Math.max(rx, ry) * 0.14) {
    rx = ry = (rx + ry) / 2
  }
  return { kind: 'ellipse', pts: ellipsePoints(c, rx, ry), closed: true }
}

/** Recognises the drawn points (page px), or null if they are not a clean shape. */
export function recogniseShape(
  points: readonly Pt[],
  options: ShapeOptions = { snap: true },
): Recognised | null {
  if (points.length < 4) return null
  const pts = [...points]
  if (isClosed(pts)) return asClosed(pts, options.snap)
  return asLine(pts, options.snap) ?? asArrow(pts, options.snap)
}

// ---- The Shapes tool: a shape from a drag ----

/** A shape picked in advance and drawn by dragging from corner to corner. */
export type DragShape = ShapeKind

/**
 * The clean shape for a drag from `a` to `b` (page px), or null while the
 * drag is still tiny. A line and an arrow run from `a` to `b`; the others
 * fill the box the two points make. With `snap`: lines and arrows snap to
 * 45 degrees, boxes near square become squares, ellipses near round become
 * circles.
 */
export function shapeFromDrag(
  kind: DragShape,
  a: Pt,
  b: Pt,
  snap: boolean,
): Recognised | null {
  if (dist(a, b) < 6) return null
  if (kind === 'line') {
    return { kind, pts: [a, snap ? snapLine(a, b) : b], closed: false }
  }
  if (kind === 'arrow') {
    const tip = snap ? snapLine(a, b) : b
    const len = dist(a, tip)
    const dir = Math.atan2(tip.y - a.y, tip.x - a.x)
    const size = Math.min(len * 0.3, 26)
    const barb = (sign: number): Pt => ({
      x: tip.x - Math.cos(dir + sign * 0.5) * size,
      y: tip.y - Math.sin(dir + sign * 0.5) * size,
    })
    return {
      kind,
      pts: [a, tip, barb(1), tip, barb(-1)],
      closed: false,
    }
  }
  // Boxes: the two points are opposite corners.
  let dx = b.x - a.x
  let dy = b.y - a.y
  if (
    snap &&
    Math.abs(Math.abs(dx) - Math.abs(dy)) <
      Math.max(Math.abs(dx), Math.abs(dy)) * 0.12
  ) {
    const s = (Math.abs(dx) + Math.abs(dy)) / 2
    dx = Math.sign(dx || 1) * s
    dy = Math.sign(dy || 1) * s
  }
  const x0 = Math.min(a.x, a.x + dx)
  const y0 = Math.min(a.y, a.y + dy)
  const w = Math.abs(dx)
  const h = Math.abs(dy)
  if (w < 6 || h < 6) return null
  if (kind === 'ellipse') {
    return {
      kind,
      pts: ellipsePoints({ x: x0 + w / 2, y: y0 + h / 2 }, w / 2, h / 2),
      closed: true,
    }
  }
  if (kind === 'triangle') {
    const t = [
      { x: x0 + w / 2, y: y0 },
      { x: x0 + w, y: y0 + h },
      { x: x0, y: y0 + h },
    ]
    return { kind, pts: [...t, t[0]], closed: true }
  }
  const r = [
    { x: x0, y: y0 },
    { x: x0 + w, y: y0 },
    { x: x0 + w, y: y0 + h },
    { x: x0, y: y0 + h },
  ]
  return { kind: 'rect', pts: [...r, r[0]], closed: true }
}

// ---- Quick gestures ----

/**
 * Scribble: the pen goes back and forth many times in a small area (at
 * least 5 sharp turns, and a long path for the space it covers).
 */
export function isScribble(points: readonly Pt[]): boolean {
  if (points.length < 12) return false
  const b = boundsOf(points)
  const d = diag(b)
  if (d < 20) return false
  const total = pathLength(points)
  if (total < d * 3.2) return false
  const poly = simplify(points, Math.max(3, d * 0.06))
  let turns = 0
  for (let i = 1; i < poly.length - 1; i++) {
    const v1 = { x: poly[i].x - poly[i - 1].x, y: poly[i].y - poly[i - 1].y }
    const v2 = { x: poly[i + 1].x - poly[i].x, y: poly[i + 1].y - poly[i].y }
    const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)
    if (m === 0) continue
    if ((v1.x * v2.x + v1.y * v2.y) / m < -0.35) turns++
  }
  return turns >= 4
}

/** A circle-like loop: closed, round enough, big enough. */
export function isLoop(points: readonly Pt[]): boolean {
  if (points.length < 8) return false
  const b = boundsOf(points)
  if (b.w < 40 || b.h < 40) return false
  if (!isClosed([...points])) return false
  const total = pathLength(points)
  // About one lap: not a scribble, not a long wander.
  const around = (Math.PI * (b.w + b.h)) / 2
  return total > around * 0.7 && total < around * 1.8
}

/** Is `p` inside the loop the points make? */
export const insideLoop = (p: Pt, points: readonly Pt[]): boolean =>
  inPolygon(p, points)
