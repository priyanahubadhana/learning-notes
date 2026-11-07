import { distToSegment } from '../../ink/geometry'
import type { PadPoint, PadStroke } from './pressure'

/**
 * The main bar's Eraser, applied to the AI pad's pen strokes (R7-15). Same
 * three modes as the page: precise cuts out exactly what the eraser touched,
 * standard reaches a little further and drops tiny leftovers, stroke removes
 * the whole stroke it touches. Units are the pad's own pixels.
 */
export type PadEraseMode = 'precise' | 'standard' | 'stroke'

const STANDARD_REACH = 1.35
const STANDARD_MIN_PIECE = 1.5

/** The stroke with extra points so none are further apart than `gap`. */
function densify(s: PadStroke, gap: number): PadPoint[] {
  const out: PadPoint[] = s.length ? [s[0]] : []
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1]
    const b = s[i]
    const steps = Math.min(
      64,
      Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / gap),
    )
    for (let k = 1; k < steps; k++) {
      const f = k / steps
      out.push({
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        p: a.p + (b.p - a.p) * f,
      })
    }
    out.push(b)
  }
  return out
}

const length = (pts: readonly PadPoint[]): number => {
  let n = 0
  for (let i = 1; i < pts.length; i++)
    n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return n
}

/**
 * Rubs the eraser (radius `radius`) along the segment a → b. Returns the
 * same array when nothing was touched, else the strokes that are left.
 */
export function erasePadStrokes(
  strokes: readonly PadStroke[],
  a: { x: number; y: number },
  b: { x: number; y: number },
  radius: number,
  mode: PadEraseMode,
): readonly PadStroke[] {
  const reach = mode === 'standard' ? radius * STANDARD_REACH : radius
  const out: PadStroke[] = []
  let changed = false
  for (const stroke of strokes) {
    const pts = densify(stroke, Math.max(reach / 2, 0.5))
    const hit = pts.map((p) => distToSegment(p, a, b) <= reach)
    if (!hit.some(Boolean)) {
      out.push(stroke)
      continue
    }
    changed = true
    if (mode === 'stroke') continue
    let run: PadPoint[] = []
    const flush = () => {
      const dot = stroke.length === 1
      if (run.length >= 2 || (dot && run.length === 1)) {
        if (mode !== 'standard' || length(run) >= radius * STANDARD_MIN_PIECE)
          out.push(run)
      }
      run = []
    }
    pts.forEach((p, i) => {
      if (hit[i]) flush()
      else run.push(p)
    })
    flush()
  }
  return changed ? out : strokes
}
