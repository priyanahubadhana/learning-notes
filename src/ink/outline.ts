import { getStroke } from 'perfect-freehand'
import { STRIDE, type Stroke } from '../core/inkTypes'

/**
 * The shape of a stroke on the page, from its raw points and style.
 * Coordinates are in "ink units": 1000 units = one page width (the saved
 * coordinates times UNIT), so one drawing works at any page width.
 *
 * - `fill`: a closed outline (perfect-freehand) filled with the colour:
 *   Fountain, Ball, Brush, Pencil and Marker pens.
 * - `line`: a centre line stroked with a width, a dash and a cap: dashed or
 *   dotted pens, highlights and snapped shapes.
 */
export const UNIT = 1000

export type Outline =
  | { kind: 'fill'; poly: number[][] }
  | {
      kind: 'line'
      pts: number[][]
      width: number
      dash: number[]
      cap: 'round' | 'butt'
      closed: boolean
    }

interface PenShape {
  /** How much pressure thins the line (0 to 1, times the pressure setting). */
  thinning: number
  /** Taper at the ends (times the sharpness setting), in widths. */
  taper: number
  smoothing: number
  /** Flat-ended (Marker) or round. */
  cap: boolean
}

/** What makes the five pens different (the numbers are tuned by eye). */
export const PEN_SHAPE: Record<Stroke['style']['pen'], PenShape> = {
  fountain: { thinning: 0.85, taper: 5, smoothing: 0.55, cap: true },
  ball: { thinning: 0.12, taper: 1, smoothing: 0.6, cap: true },
  brush: { thinning: 0.95, taper: 9, smoothing: 0.5, cap: true },
  pencil: { thinning: 0.45, taper: 2.5, smoothing: 0.45, cap: true },
  marker: { thinning: 0, taper: 0, smoothing: 0.6, cap: false },
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n))

/** Pressure per point after the pen's own rules (flat nib, tilt, speed). */
function effectivePressure(stroke: Stroke): number[] {
  const { pts, style } = stroke
  const n = pts.length / STRIDE
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const at = i * STRIDE
    let p = pts[at + 2]
    const prev = Math.max(0, i - 1) * STRIDE
    const next = Math.min(n - 1, i + 1) * STRIDE
    const dx = pts[next] - pts[prev]
    const dy = pts[next + 1] - pts[prev + 1]
    if (style.pen === 'fountain' && style.flatness > 0 && (dx || dy)) {
      // A flat nib is thickest across the 45 degree angle.
      const across = Math.abs(Math.sin(Math.atan2(dy, dx) - Math.PI / 4))
      p *= 1 - (style.flatness / 100) * 0.75 * (1 - across)
    }
    if (style.tilt && (style.pen === 'pencil' || style.pen === 'brush')) {
      const tilt = Math.hypot(pts[at + 3], pts[at + 4]) / 90
      p *= 1 + clamp(tilt, 0, 1) * 0.9
    }
    if (style.speedWidth) {
      const dt = pts[next + 5] - pts[prev + 5]
      if (dt > 0) {
        const speed = Math.hypot(dx, dy) / dt / 0.003
        p *= 1 - 0.45 * clamp(speed, 0, 1)
      }
    }
    out.push(clamp(p, 0.02, 1.6))
  }
  return out
}

/** Does the stroke carry real pressure (not one constant value)? */
function hasRealPressure(stroke: Stroke): boolean {
  const { pts } = stroke
  for (let i = STRIDE + 2; i < pts.length; i += STRIDE) {
    if (pts[i] !== pts[2]) return true
  }
  return false
}

/** Width of the stroke in ink units. */
export const widthUnits = (stroke: Stroke): number =>
  (stroke.style.width / stroke.bw) * UNIT

/** The centre line in ink units, lightly smoothed. */
function centre(stroke: Stroke): number[][] {
  const out: number[][] = []
  const { pts } = stroke
  for (let i = 0; i < pts.length; i += STRIDE) {
    out.push([pts[i] * UNIT, pts[i + 1] * UNIT])
  }
  return out
}

/** Outline of a stroke. A stroke with no points has none. */
export function strokeOutline(stroke: Stroke): Outline | null {
  const n = stroke.pts.length / STRIDE
  if (n === 0) return null
  const { style } = stroke
  const w = widthUnits(stroke)
  const line = centre(stroke)

  if (stroke.kind === 'highlight' || stroke.shape || style.line !== 'solid') {
    const dot = style.line === 'dotted'
    const dash =
      style.line === 'dashed' ? [w * 3, w * 2] : dot ? [0.1, w * 2] : []
    return {
      kind: 'line',
      pts: line,
      width: w,
      dash,
      cap: stroke.kind === 'highlight' ? 'butt' : dot ? 'round' : 'round',
      closed:
        stroke.shape === 'rect' ||
        stroke.shape === 'ellipse' ||
        stroke.shape === 'triangle',
    }
  }

  const shape = PEN_SHAPE[style.pen]
  const pressure = effectivePressure(stroke)
  const real = hasRealPressure(stroke)
  const input = line.map(([x, y], i) => [x, y, pressure[i]])
  const taper = shape.taper * (style.sharpness / 100) * w
  const poly = getStroke(input, {
    size: w,
    thinning: shape.thinning * (style.pressure / 100),
    smoothing: shape.smoothing,
    streamline: 0.15 + 0.75 * (style.stabilisation / 100),
    simulatePressure: !real,
    easing: (t) => t,
    start: { taper, cap: shape.cap },
    end: { taper, cap: shape.cap },
    last: true,
  })
  return { kind: 'fill', poly }
}

/** The outline as a bounding box in ink units, with a margin for the width. */
export function outlineBounds(
  o: Outline,
  widthU: number,
): { x0: number; y0: number; x1: number; y1: number } {
  const pts = o.kind === 'fill' ? o.poly : o.pts
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of pts) {
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  const m = o.kind === 'line' ? widthU / 2 + 1 : 1
  return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m }
}
