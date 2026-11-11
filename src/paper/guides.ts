/**
 * Smart guides while a box is dragged (owner OK 11 Nov; Notability's thin
 * lines, but better): pure maths in mm, no DOM.
 *
 * - Edge and centre alignment with the other boxes (left / centre / right and
 *   top / middle / bottom).
 * - A page-centre line.
 * - Equal spacing: the dragged box makes the same gap as the gap between two
 *   boxes already there, or sits exactly half way between two.
 * - A gentle snap: within `SNAP_MM` the box is pulled onto the line; further
 *   away nothing moves.
 *
 * Each guide runs only between the dragged box and the object it matches (not
 * across the page), as Notability draws them. Nothing here moves a box onto
 * another: the caller still keeps boxes from overlapping.
 */

export interface GRect {
  id?: string
  x: number
  y: number
  w: number
  h: number
}

/** A thin line: vertical (`axis: 'x'`, at an x) or horizontal (`axis: 'y'`). */
export interface Guide {
  axis: 'x' | 'y'
  /** Where it is (mm): the x of a vertical line, the y of a horizontal one. */
  at: number
  /** The stretch it covers along the other axis (mm). */
  from: number
  to: number
  kind: 'edge' | 'centre' | 'page'
}

/** An equal-spacing mark: a gap between two boxes, drawn with end ticks. */
export interface GapMark {
  axis: 'x' | 'y'
  /** The gap's start and end along its axis (mm). */
  from: number
  to: number
  /** Where across it is drawn (mm), the middle of the shared range. */
  across: number
}

export interface SnapResult {
  /** How far the box was pulled (mm). */
  dx: number
  dy: number
  guides: Guide[]
  marks: GapMark[]
}

/** Pull-in distance (mm): gentle, about 5 px on an iPad. */
export const SNAP_MM = 1.5
const EPS = 0.05

const lines = (r: GRect, axis: 'x' | 'y') =>
  axis === 'x'
    ? [r.x, r.x + r.w / 2, r.x + r.w]
    : [r.y, r.y + r.h / 2, r.y + r.h]

/** The smallest shift (within the threshold) that puts a line of `a` on one of `to`. */
function best(a: number[], to: number[], max: number): number | null {
  let out: number | null = null
  for (const p of a)
    for (const q of to) {
      const d = q - p
      if (Math.abs(d) <= max && (out === null || Math.abs(d) < Math.abs(out)))
        out = d
    }
  return out
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) =>
  Math.min(a1, b1) - Math.max(a0, b0) > 0

/**
 * Pulls `moving` onto the nearest alignment and says which guides to draw.
 * `others` are the boxes standing still (the page's own text box included);
 * `pageW` is the sheet width (the page-centre line).
 */
export function snapBox(
  moving: GRect,
  others: readonly GRect[],
  pageW: number,
  max = SNAP_MM,
): SnapResult {
  // ---- X: alignment with each other box, the page centre, equal gaps
  const xTargets: number[] = []
  const yTargets: number[] = []
  for (const o of others) {
    xTargets.push(...lines(o, 'x'))
    yTargets.push(...lines(o, 'y'))
  }
  const pageCentre = pageW / 2
  let dx = best(lines(moving, 'x'), xTargets, max)
  const dPage = best([moving.x + moving.w / 2], [pageCentre], max)
  if (dPage !== null && (dx === null || Math.abs(dPage) < Math.abs(dx)))
    dx = dPage
  let dy = best(lines(moving, 'y'), yTargets, max)

  // Equal spacing (only when nothing aligned better on that axis).
  const gapX = equalGap(moving, others, 'x', max)
  if (gapX && (dx === null || Math.abs(gapX.shift) < Math.abs(dx)))
    dx = gapX.shift
  const gapY = equalGap(moving, others, 'y', max)
  if (gapY && (dy === null || Math.abs(gapY.shift) < Math.abs(dy)))
    dy = gapY.shift

  const at: GRect = {
    ...moving,
    x: moving.x + (dx ?? 0),
    y: moving.y + (dy ?? 0),
  }

  // ---- The guides that now line up
  const guides: Guide[] = []
  const kinds: Guide['kind'][] = ['edge', 'centre', 'edge']
  for (const o of others) {
    lines(o, 'x').forEach((q, i) => {
      const hit = lines(at, 'x').findIndex((p) => Math.abs(p - q) < EPS)
      if (hit >= 0)
        guides.push({
          axis: 'x',
          at: q,
          from: Math.min(at.y, o.y),
          to: Math.max(at.y + at.h, o.y + o.h),
          kind: i === 1 && hit === 1 ? 'centre' : kinds[i],
        })
    })
    lines(o, 'y').forEach((q, i) => {
      const hit = lines(at, 'y').findIndex((p) => Math.abs(p - q) < EPS)
      if (hit >= 0)
        guides.push({
          axis: 'y',
          at: q,
          from: Math.min(at.x, o.x),
          to: Math.max(at.x + at.w, o.x + o.w),
          kind: i === 1 && hit === 1 ? 'centre' : kinds[i],
        })
    })
  }
  if (Math.abs(at.x + at.w / 2 - pageCentre) < EPS)
    guides.push({
      axis: 'x',
      at: pageCentre,
      from: at.y - 6,
      to: at.y + at.h + 6,
      kind: 'page',
    })

  const marks = [...gapMarks(at, others, 'x'), ...gapMarks(at, others, 'y')]
  return { dx: dx ?? 0, dy: dy ?? 0, guides: dedupe(guides), marks }
}

function dedupe(gs: Guide[]): Guide[] {
  const out: Guide[] = []
  for (const g of gs) {
    const same = out.find(
      (o) =>
        o.axis === g.axis &&
        Math.abs(o.at - g.at) < EPS &&
        Math.abs(o.from - g.from) < EPS &&
        Math.abs(o.to - g.to) < EPS,
    )
    if (!same) out.push(g)
  }
  return out
}

/** Neighbours of `m` on one axis that share its cross-axis range. */
function sameBand(m: GRect, others: readonly GRect[], axis: 'x' | 'y') {
  return others.filter((o) =>
    axis === 'x'
      ? overlaps(m.y, m.y + m.h, o.y, o.y + o.h)
      : overlaps(m.x, m.x + m.w, o.x, o.x + o.w),
  )
}

const span = (r: GRect, axis: 'x' | 'y') =>
  axis === 'x' ? [r.x, r.x + r.w] : [r.y, r.y + r.h]

/**
 * A shift that makes the gap beside `m` equal to a gap between two other
 * boxes, or puts `m` half way between two, if one is within `max`.
 */
function equalGap(
  m: GRect,
  others: readonly GRect[],
  axis: 'x' | 'y',
  max: number,
): { shift: number } | null {
  const row = sameBand(m, others, axis)
    .map((r) => span(r, axis))
    .sort((a, b) => a[0] - b[0])
  const [m0, m1] = span(m, axis)
  let out: number | null = null
  const take = (d: number) => {
    if (Math.abs(d) <= max && (out === null || Math.abs(d) < Math.abs(out)))
      out = d
  }
  // Half way between the box on its left and the one on its right.
  for (let i = 0; i + 1 < row.length; i++) {
    const room = row[i + 1][0] - row[i][1] - (m1 - m0)
    if (room > 0) take(row[i][1] + room / 2 - m0)
  }
  // The same gap as between two neighbours, continuing the rhythm.
  for (let i = 0; i + 1 < row.length; i++) {
    const gap = row[i + 1][0] - row[i][1]
    if (gap <= 0) continue
    take(row[i + 1][1] + gap - m0) // to the right of the pair
    take(row[i][0] - gap - m1) // to the left of the pair
  }
  return out === null ? null : { shift: out }
}

/** The equal gaps the (snapped) box now makes, as marks to draw. */
function gapMarks(
  m: GRect,
  others: readonly GRect[],
  axis: 'x' | 'y',
): GapMark[] {
  const row = sameBand(m, others, axis)
    .map((r) => ({ s: span(r, axis), r }))
    .sort((a, b) => a.s[0] - b.s[0])
  const [m0, m1] = span(m, axis)
  const gaps: { from: number; to: number; r: GRect | null }[] = []
  // Gaps of the rhythm: between neighbours (including the moving box).
  const all = [
    ...row.map((x) => ({ s: x.s, r: x.r as GRect | null })),
    { s: [m0, m1], r: null },
  ].sort((a, b) => a.s[0] - b.s[0])
  for (let i = 0; i + 1 < all.length; i++) {
    const g = all[i + 1].s[0] - all[i].s[1]
    if (g > EPS)
      gaps.push({
        from: all[i].s[1],
        to: all[i + 1].s[0],
        r: all[i + 1].r ?? all[i].r,
      })
  }
  const out: GapMark[] = []
  for (let i = 0; i < gaps.length; i++)
    for (let j = i + 1; j < gaps.length; j++) {
      const a = gaps[i]
      const b = gaps[j]
      if (Math.abs(a.to - a.from - (b.to - b.from)) > EPS) continue
      // Only gaps that touch the moving box count as feedback.
      const touches = (g: { from: number; to: number }) =>
        Math.abs(g.from - m1) < EPS || Math.abs(g.to - m0) < EPS
      if (!touches(a) && !touches(b)) continue
      for (const g of [a, b]) {
        const across =
          axis === 'x'
            ? Math.max(m.y, g.r?.y ?? m.y) +
              (Math.min(m.y + m.h, (g.r?.y ?? m.y) + (g.r?.h ?? m.h)) -
                Math.max(m.y, g.r?.y ?? m.y)) /
                2
            : Math.max(m.x, g.r?.x ?? m.x) +
              (Math.min(m.x + m.w, (g.r?.x ?? m.x) + (g.r?.w ?? m.w)) -
                Math.max(m.x, g.r?.x ?? m.x)) /
                2
        if (
          !out.some((o) => o.axis === axis && Math.abs(o.from - g.from) < EPS)
        )
          out.push({ axis, from: g.from, to: g.to, across })
      }
    }
  return out
}
