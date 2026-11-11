import type { GridRow } from '../core/types'
import {
  FREE_MIN_W,
  freeMaxW,
  insertAt,
  insertRow,
  isFreeRow,
  layoutRows,
  MIN_FRAC,
  removeBox,
  resizeCols,
  zoneOf,
  type Geometry,
  type Rect,
} from './grid'
import { MAIN_BOX } from './boxes'

/**
 * The maths of the Layout pop-up (Layout mode v2): drop a box on the preview,
 * pull a box's right edge, and the tidy choices. Pure, in mm, no DOM. Every
 * function returns new rows; nothing is written until Done.
 */

export type Laid = Map<string, Rect & { h: number }>

const round = (v: number) => Math.round(v * 10) / 10

/** The row that holds a box. */
const rowOf = (rows: readonly GridRow[], id: string) =>
  rows.find((r) => r.cols.some((c) => c.boxIds.includes(id)))

/**
 * The rows after dropping `id` with the pointer at (`mx`, `my`) mm. Over
 * another box: its left / right / top / bottom zone adds a column or stacks
 * (the page grid, as on the page). On blank paper: a free box, centred on the
 * pointer, its width kept. `full` says the wanted spot was full.
 */
export function planDrop(
  rows: readonly GridRow[],
  laid: Laid,
  id: string,
  mx: number,
  my: number,
  g: Geometry,
): { rows: GridRow[]; full: boolean; blank: boolean } {
  for (const [other, rc] of laid) {
    if (other === id) continue
    if (mx >= rc.x && mx <= rc.x + rc.w && my >= rc.y && my <= rc.y + rc.h) {
      const d = insertAt(
        rows,
        other,
        zoneOf((mx - rc.x) / rc.w, (my - rc.y) / rc.h),
        id,
      )
      return { rows: d.rows, full: d.full, blank: false }
    }
  }
  const was = laid.get(id)
  const w = was?.w ?? FREE_MIN_W
  const row0 = rowOf(rows, id)
  const wasAuto =
    !!row0 && isFreeRow(row0) && !!row0.auto && row0.wmm === undefined
  const x = Math.min(Math.max(0, mx - w / 2), g.sheetW - g.right - FREE_MIN_W)
  const y = Math.max(0, my - 4)
  if (id === MAIN_BOX) {
    const base = removeBox(rows, id)
    const idx = base.filter((r) => rowTop(r, laid) < y).length
    return { rows: insertRow(rows, idx, id, y), full: false, blank: true }
  }
  const base = removeBox(rows, id)
  const idx = base.filter((r) => rowTop(r, laid) < y).length
  return {
    rows: insertRow(rows, idx, id, y, { x, wmm: wasAuto ? undefined : w }),
    full: false,
    blank: true,
  }
}

const rowTop = (row: GridRow, laid: Laid) =>
  Math.min(
    ...row.cols.flatMap((c) => c.boxIds).map((b) => laid.get(b)?.y ?? 1e9),
  )

/**
 * Pulls the right edge of a box to `rightMm`. A box in columns moves the divider
 * beside it (the last column cannot); a free box gets a width of its own; a
 * lone box in the page column gets a narrower share of the row.
 */
export function resizeRight(
  rows: readonly GridRow[],
  laid: Laid,
  id: string,
  rightMm: number,
  g: Geometry,
): GridRow[] {
  const row = rowOf(rows, id)
  const rc = laid.get(id)
  if (!row || !rc) return [...rows]
  const next = (r: GridRow): GridRow[] =>
    rows.map((x) => (x.id === row.id ? r : x))
  if (isFreeRow(row)) {
    const w = Math.min(
      g.sheetW - (row.x ?? 0),
      Math.max(FREE_MIN_W, rightMm - (row.x ?? 0)),
    )
    const r = { ...row, wmm: round(w) }
    delete r.auto
    return next(r)
  }
  const ci = row.cols.findIndex((c) => c.boxIds.includes(id))
  if (row.cols.length === 1) {
    const content = g.sheetW - g.left - g.right
    const frac = Math.min(1, Math.max(MIN_FRAC, (rightMm - g.left) / content))
    return next({
      ...row,
      cols: [{ ...row.cols[0], w: round(frac * 100) / 100 }],
    })
  }
  if (ci >= row.cols.length - 1) return [...rows]
  const content = g.sheetW - g.left - g.right
  return next(resizeCols(row, ci, (rightMm - g.left) / content))
}

/** Line up left: every free box starts at the left margin. */
export function lineUpLeft(rows: readonly GridRow[], g: Geometry): GridRow[] {
  return rows.map((r) => (isFreeRow(r) ? { ...r, x: round(g.left) } : r))
}

/**
 * Space evenly (3 boxes or more besides the page's own text): the rows below
 * the first keep their order and get equal gaps between them, from the top of
 * the first to the bottom of the last.
 */
export function spaceEvenly(
  rows: readonly GridRow[],
  laid: Laid,
): GridRow[] | null {
  const list = rows.filter(
    (r) => !r.cols.some((c) => c.boxIds.includes(MAIN_BOX)),
  )
  if (list.length < 3) return null
  const tops = list.map((r) => rowTop(r, laid))
  const hs = list.map((r) =>
    Math.max(
      ...r.cols.map((c) =>
        c.boxIds.reduce((s, b) => s + (laid.get(b)?.h ?? 0), 0),
      ),
    ),
  )
  const start = tops[0]
  const end = Math.max(...list.map((_, i) => tops[i] + hs[i]))
  const gap = (end - start - hs.reduce((a, b) => a + b, 0)) / (list.length - 1)
  if (gap < 0) return null
  let y = start
  const ys = new Map<string, number>()
  list.forEach((r, i) => {
    ys.set(r.id, round(y))
    y += hs[i] + gap
  })
  return rows.map((r) => (ys.has(r.id) ? { ...r, y: ys.get(r.id) } : r))
}

/** The widest a free box may grow (re-exported for the pop-up's labels). */
export { freeMaxW, layoutRows }
