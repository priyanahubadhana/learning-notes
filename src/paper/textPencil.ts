import { recogniseShape, type Recognised } from '../ink/shapes'
import type { Pt } from '../ink/geometry'

/**
 * Text tool + Pencil (owner, 11 Nov). With the Text tool on, the Pencil
 * writes text inside a box (iPadOS Scribble does that itself) and, outside
 * text, a drawn arrow, line, circle or rectangle becomes a clean shape on the
 * ink layer. A circle drawn round a digit makes a circled number like ②.
 * The Pen tool never converts (the page only calls this for the Text tool).
 * Pure maths on client px; the page does the rest.
 */

/** The shapes the Text tool turns clean (not the triangle). */
const KINDS = new Set(['line', 'arrow', 'rect', 'ellipse'])

/** A stroke shorter than this (px across) is a tap or a dot, not a shape. */
const MIN_DIAG = 28

/**
 * A closed, round stroke is an ellipse even when it is small (the general
 * recogniser reads a small ring as a polygon): the distance from the middle
 * stays within 18 % of the average all the way round.
 */
function roundStroke(points: readonly Pt[]): Recognised | null {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = maxX - minX
  const h = maxY - minY
  if (Math.min(w, h) < 12 || Math.max(w, h) > Math.min(w, h) * 2) return null
  const first = points[0]
  const last = points[points.length - 1]
  if (Math.hypot(first.x - last.x, first.y - last.y) > Math.max(w, h) * 0.35)
    return null
  const cx = minX + w / 2
  const cy = minY + h / 2
  const rs = points.map((p) =>
    Math.hypot((p.x - cx) / (w / 2), (p.y - cy) / (h / 2)),
  )
  const mean = rs.reduce((a, r) => a + r, 0) / rs.length
  if (rs.some((r) => Math.abs(r - mean) > 0.18)) return null
  const pts = Array.from({ length: 73 }, (_, i) => ({
    x: cx + Math.cos((i / 72) * Math.PI * 2) * (w / 2),
    y: cy + Math.sin((i / 72) * Math.PI * 2) * (h / 2),
  }))
  return { kind: 'ellipse', pts, closed: true }
}

export function cleanShape(points: readonly Pt[]): Recognised | null {
  if (points.length < 6) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const diag = Math.hypot(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  )
  if (diag < MIN_DIAG) return null
  const round = roundStroke(points)
  if (round) return round
  const found = recogniseShape(points, { snap: true })
  return found && KINDS.has(found.kind) ? found : null
}

const CIRCLED = [
  '⓪',
  '①',
  '②',
  '③',
  '④',
  '⑤',
  '⑥',
  '⑦',
  '⑧',
  '⑨',
  '⑩',
  '⑪',
  '⑫',
  '⑬',
  '⑭',
  '⑮',
  '⑯',
  '⑰',
  '⑱',
  '⑲',
  '⑳',
]

/** ① to ⑳ (and ⓪) for a number 0 to 20; null for anything else. */
export const circledNumber = (n: number): string | null =>
  Number.isInteger(n) && n >= 0 && n <= 20 ? CIRCLED[n] : null

/** A run of digits in a piece of text: where, and its number. */
export function digitRuns(
  text: string,
): { start: number; end: number; n: number }[] {
  return [...text.matchAll(/\d{1,2}/g)].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    n: Number(m[0]),
  }))
}

/** The minimum of an editor view the digit search needs. */
export interface DigitView {
  state: {
    doc: {
      descendants: (
        fn: (
          node: { isText: boolean; text?: string | null },
          pos: number,
        ) => boolean | void,
      ) => void
    }
    tr: {
      insertText: (text: string, from: number, to: number) => unknown
    }
  }
  coordsAtPos: (pos: number) => {
    left: number
    right: number
    top: number
    bottom: number
  }
  dispatch: (tr: never) => void
}

/**
 * The digit run (1 or 2 digits, 0 to 20) whose letters lie inside the circle
 * `ring` (client px), nearest the circle's middle; the circle must be about
 * the size of the digit, not a big loop round a paragraph. Null if none.
 */
export function digitInCircle(
  view: DigitView,
  ring: { x: number; y: number; w: number; h: number },
): { from: number; to: number; text: string } | null {
  const cx = ring.x + ring.w / 2
  const cy = ring.y + ring.h / 2
  const found: { from: number; to: number; text: string; d: number }[] = []
  view.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    for (const run of digitRuns(node.text)) {
      const circled = circledNumber(run.n)
      if (!circled) continue
      const a = view.coordsAtPos(pos + run.start)
      const b = view.coordsAtPos(pos + run.end)
      const r = {
        left: Math.min(a.left, b.left),
        right: Math.max(a.right, b.right),
        top: Math.min(a.top, b.top),
        bottom: Math.max(a.bottom, b.bottom),
      }
      const slack = 8
      const inside =
        r.left >= ring.x - slack &&
        r.right <= ring.x + ring.w + slack &&
        r.top >= ring.y - slack &&
        r.bottom <= ring.y + ring.h + slack
      // A ring round a digit is not much bigger than the digit.
      const small =
        ring.w <= (r.right - r.left) * 4 + 30 &&
        ring.h <= (r.bottom - r.top) * 3 + 30
      if (!inside || !small) continue
      const d = Math.hypot(
        (r.left + r.right) / 2 - cx,
        (r.top + r.bottom) / 2 - cy,
      )
      found.push({ from: pos + run.start, to: pos + run.end, text: circled, d })
    }
  })
  found.sort((a, b) => a.d - b.d)
  const best = found[0]
  return best ? { from: best.from, to: best.to, text: best.text } : null
}

/** Replaces the digit run with its circled number: one editor step (one Undo). */
export function circleDigit(
  view: DigitView,
  ring: Parameters<typeof digitInCircle>[1],
): boolean {
  const hit = digitInCircle(view, ring)
  if (!hit) return false
  view.dispatch(view.state.tr.insertText(hit.text, hit.from, hit.to) as never)
  return true
}
