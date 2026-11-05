import { STRIDE, type Stroke } from '../core/inkTypes'

/** Small geometry helpers shared by the ink engine. No DOM, no canvas. */

export interface Pt {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
/** A 2D affine transform: x' = a x + c y + e, y' = b x + d y + f. */
export interface Affine {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export const IDENTITY: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

export const apply = (m: Affine, p: Pt): Pt => ({
  x: m.a * p.x + m.c * p.y + m.e,
  y: m.b * p.x + m.d * p.y + m.f,
})

/** Scale about `origin`, then rotate about it (radians), then move by (dx, dy). */
export function around(
  origin: Pt,
  scale: number,
  angle: number,
  dx = 0,
  dy = 0,
): Affine {
  const cos = Math.cos(angle) * scale
  const sin = Math.sin(angle) * scale
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: origin.x - (cos * origin.x - sin * origin.y) + dx,
    f: origin.y - (sin * origin.x + cos * origin.y) + dy,
  }
}

export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y)

/** Distance from p to the segment a-b. */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return dist(p, a)
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2),
  )
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function boundsOf(points: readonly Pt[]): Rect {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of points) {
    if (p.x < x0) x0 = p.x
    if (p.y < y0) y0 = p.y
    if (p.x > x1) x1 = p.x
    if (p.y > y1) y1 = p.y
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export const unionRect = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  }
}

export const inflate = (r: Rect, by: number): Rect => ({
  x: r.x - by,
  y: r.y - by,
  w: r.w + by * 2,
  h: r.h + by * 2,
})

export const intersects = (a: Rect, b: Rect): boolean =>
  a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h

export const containsPt = (r: Rect, p: Pt): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

/** Is p inside the polygon (even-odd rule)? */
export function inPolygon(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
}

export function pathLength(points: readonly Pt[]): number {
  let n = 0
  for (let i = 1; i < points.length; i++) n += dist(points[i - 1], points[i])
  return n
}

/** Ramer-Douglas-Peucker simplification. */
export function simplify(points: readonly Pt[], epsilon: number): Pt[] {
  if (points.length < 3) return [...points]
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = keep[points.length - 1] = true
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [lo, hi] = stack.pop()!
    let far = -1
    let farD = epsilon
    for (let i = lo + 1; i < hi; i++) {
      const d = distToSegment(points[i], points[lo], points[hi])
      if (d > farD) {
        farD = d
        far = i
      }
    }
    if (far >= 0) {
      keep[far] = true
      stack.push([lo, far], [far, hi])
    }
  }
  return points.filter((_, i) => keep[i])
}

// ---- Strokes as point lists ----

export const pointCount = (s: Pick<Stroke, 'pts'>): number =>
  s.pts.length / STRIDE

/** The x, y of every point of a stroke (its own units). */
export function xy(s: Pick<Stroke, 'pts'>): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < s.pts.length; i += STRIDE) {
    out.push({ x: s.pts[i], y: s.pts[i + 1] })
  }
  return out
}

const round = (n: number, digits: number): number => {
  const k = 10 ** digits
  return Math.round(n * k) / k
}

/** Builds the flat `pts` list from points (positions in 4 decimals). */
export function packPoints(
  list: readonly {
    x: number
    y: number
    p?: number
    tx?: number
    ty?: number
    t?: number
  }[],
): number[] {
  const out: number[] = []
  for (const q of list) {
    out.push(
      round(q.x, 4),
      round(q.y, 4),
      round(q.p ?? 0.5, 2),
      Math.round(q.tx ?? 0),
      Math.round(q.ty ?? 0),
      Math.round(q.t ?? 0),
    )
  }
  return out
}

/** Replaces the x, y of every point using `f`, keeping pressure, tilt and time. */
export function mapXY(pts: readonly number[], f: (p: Pt) => Pt): number[] {
  const out = pts.slice()
  for (let i = 0; i < pts.length; i += STRIDE) {
    const q = f({ x: pts[i], y: pts[i + 1] })
    out[i] = round(q.x, 4)
    out[i + 1] = round(q.y, 4)
  }
  return out
}
