import type { Pt } from './geometry'
import { DEG, snapTurn } from './tapFilter'

/**
 * The ruler (G1): a straight bar on the page that is not saved. A pen that
 * starts within `RULER_REACH` px of one of its long edges slides along that
 * edge, so the line comes out straight. Pure maths in page px, no DOM.
 */

export interface RulerState {
  /** Centre of the bar. */
  cx: number
  cy: number
  /** Length along the edge. */
  len: number
  /** Turn in radians (0 = lying flat). */
  angle: number
}

/** Thickness of the bar, in px. */
export const RULER_H = 80
/** How close the pen must start to an edge to stick to it. */
const RULER_REACH = 24
export const RULER_MIN = 160
export const RULER_MAX = 1200

export interface Edge {
  a: Pt
  b: Pt
}

/** The bar's two long edges: the upper one first. */
export function rulerEdges(r: RulerState): [Edge, Edge] {
  const dx = Math.cos(r.angle)
  const dy = Math.sin(r.angle)
  // Normal to the bar (pointing "down" when the bar lies flat).
  const nx = -dy
  const ny = dx
  const h = RULER_H / 2
  const half = r.len / 2
  const edge = (side: number): Edge => ({
    a: {
      x: r.cx - dx * half + nx * h * side,
      y: r.cy - dy * half + ny * h * side,
    },
    b: {
      x: r.cx + dx * half + nx * h * side,
      y: r.cy + dy * half + ny * h * side,
    },
  })
  return [edge(-1), edge(1)]
}

/** The point on the edge's segment nearest to `p`. */
export function projectOnEdge(p: Pt, e: Edge): Pt {
  const dx = e.b.x - e.a.x
  const dy = e.b.y - e.a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return e.a
  const t = Math.max(
    0,
    Math.min(1, ((p.x - e.a.x) * dx + (p.y - e.a.y) * dy) / len2),
  )
  return { x: e.a.x + t * dx, y: e.a.y + t * dy }
}

/** The edge the point is near enough to stick to, or null. */
export function nearestEdge(
  p: Pt,
  r: RulerState,
  reach = RULER_REACH,
): Edge | null {
  let best: Edge | null = null
  let bestD = reach
  for (const e of rulerEdges(r)) {
    const q = projectOnEdge(p, e)
    const d = Math.hypot(p.x - q.x, p.y - q.y)
    if (d <= bestD) {
      bestD = d
      best = e
    }
  }
  return best
}

/** The turn in whole degrees, 0 to 179 (the bar has no front or back). */
export function angleDegrees(r: RulerState): number {
  const deg = (r.angle * 180) / Math.PI
  return Math.round(((deg % 180) + 180) % 180) % 180
}

/** Turns freely but clicks to every 15 degrees when within 2 (research brief). */
export function snapAngle(angle: number, within = 2 * DEG): number {
  return snapTurn(angle, 15 * DEG, within)
}

/** A bar the user can see: starts flat in the middle of the view. */
export function newRuler(width: number, viewTop: number): RulerState {
  const len = Math.max(RULER_MIN, Math.min(560, Math.round(width * 0.7)))
  return { cx: width / 2, cy: viewTop + 180, len, angle: 0 }
}
