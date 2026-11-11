import type { GridRow, PaperBox } from '../core/types'
import { MAX_COLS, MAX_STACK, MIN_FRAC } from '../core/gridRows'

export { isGridRows } from '../core/gridRows'

/**
 * Box grid (bug batch item 26, 10 Nov; plan docs/plans/box-grid-plan.md).
 * Boxes never overlap: they sit in rows of 1-3 columns, a column holds 1-2
 * boxes stacked (so at most 6 boxes in an area). Pure maths, no DOM, in mm.
 * `Page.rows` stores the arrangement; a box's x / y / width are derived from
 * it by `layoutRows` (the box fields stay as the last known place, for old
 * clients and for pages that have no rows yet).
 */

export type { GridCol, GridRow } from '../core/types'

export { MAX_COLS, MAX_STACK, MIN_FRAC }
/** Space between rows and between stacked boxes (mm). */
export const ROW_GAP = 3
/** Space between columns (mm). */
export const COL_GAP = 4
/** A guess for a box whose height is not known yet (mm): a couple of lines. */
export const DEFAULT_H = 14

export interface Geometry {
  sheetW: number
  sheetH: number
  /** The gap between two sheets, in mm of paper (screen gap / px per mm). */
  gapMm: number
  left: number
  right: number
  top: number
  bottom: number
  /** Measured widths (mm) of boxes that are as wide as their text (free `auto` rows). */
  autoW?: Readonly<Record<string, number>>
}

/** Free boxes stop this far (mm) before the right margin, then wrap. */
export const FREE_RIGHT_GAP = 5
/** The width of a new, empty free box (mm): about one caret. */
export const FREE_MIN_W = 6

/** Does this row hold one free box (placed by `x`, not in the page column)? */
export const isFreeRow = (row: GridRow): boolean =>
  row.x !== undefined && row.cols.length === 1

/** The most a free box at `x` may grow to before it wraps (mm). */
export const freeMaxW = (
  g: Pick<Geometry, 'sheetW' | 'right'>,
  x: number,
): number => Math.max(FREE_MIN_W, g.sheetW - g.right - FREE_RIGHT_GAP - x)

export interface Rect {
  x: number
  y: number
  w: number
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
const round = (v: number) => Math.round(v * 100) / 100

/** Equal fractions for `n` columns. */
export const equalFracs = (n: number): number[] =>
  Array.from({ length: n }, () => 1 / n)

/**
 * Makes fractions each at least MIN_FRAC and sum to 1. Too many columns for
 * the minimum fall back to equal widths.
 */
export function normaliseFracs(fracs: readonly number[]): number[] {
  const n = fracs.length
  if (n === 0) return []
  if (n * MIN_FRAC > 1 + 1e-9) return equalFracs(n)
  let f = fracs.map((x) => (Number.isFinite(x) && x > 0 ? x : MIN_FRAC))
  const fixed = new Set<number>()
  for (let pass = 0; pass <= n; pass++) {
    const free = f.map((_, i) => i).filter((i) => !fixed.has(i))
    const room = 1 - fixed.size * MIN_FRAC
    const total = sum(free.map((i) => f[i]))
    f = f.map((x, i) => (fixed.has(i) ? MIN_FRAC : (x / total) * room))
    const low = free.filter((i) => f[i] < MIN_FRAC)
    if (low.length === 0) break
    for (const i of low) fixed.add(i)
  }
  return f
}

export const rowBoxIds = (row: GridRow): string[] =>
  row.cols.flatMap((c) => c.boxIds)

/** Every box id in reading order: row, then column, then stack. */
export const readingIds = (rows: readonly GridRow[]): string[] =>
  rows.flatMap(rowBoxIds)

/** The row and column holding a box, or null. */
export function find(rows: readonly GridRow[], id: string) {
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < rows[r].cols.length; c++) {
      const s = rows[r].cols[c].boxIds.indexOf(id)
      if (s >= 0) return { r, c, s }
    }
  return null
}

const clone = (rows: readonly GridRow[]): GridRow[] =>
  rows.map((row) => ({
    ...row,
    cols: row.cols.map((c) => ({ ...c, boxIds: [...c.boxIds] })),
  }))

let counter = 0
/** A new row id (not stored anywhere else, so a counter and the time are enough). */
export const newRowId = () =>
  'r' + Date.now().toString(36) + (counter++).toString(36)

/** Tidies: empty columns and rows go, fractions sum to 1 again. */
function tidy(rows: GridRow[]): GridRow[] {
  const out: GridRow[] = []
  for (const row of rows) {
    const cols = row.cols.filter((c) => c.boxIds.length > 0)
    if (cols.length === 0) continue
    // A lone box may be narrower than the page (text box v2).
    const fracs =
      row.cols.length === 1 && cols.length === 1
        ? [Math.min(1, Math.max(MIN_FRAC, cols[0].w || 1))]
        : normaliseFracs(cols.map((c) => c.w))
    const next: GridRow = {
      ...row,
      cols: cols.map((c, i) => ({ ...c, w: round(fracs[i]) })),
    }
    // Only a lone box can be free: a row with columns is the page grid again.
    if (cols.length !== 1) {
      delete next.x
      delete next.wmm
      delete next.auto
    }
    out.push(next)
  }
  return out
}

/** The rows without a box. */
export function removeBox(rows: readonly GridRow[], id: string): GridRow[] {
  return tidy(
    clone(rows).map((row) => ({
      ...row,
      cols: row.cols.map((c) => ({
        ...c,
        boxIds: c.boxIds.filter((x) => x !== id),
      })),
    })),
  )
}

/**
 * Makes `rows` match the boxes that exist (`ids`, in reading order for new
 * ones): unknown ids go, boxes in no row get a row of their own at the end,
 * a box in two places keeps the first. Used after every write of boxes.
 */
export function reconcile(
  rows: readonly GridRow[],
  ids: readonly string[],
): GridRow[] {
  const known = new Set(ids)
  const seen = new Set<string>()
  const cleaned = clone(rows).map((row) => ({
    ...row,
    cols: row.cols.map((c) => ({
      ...c,
      boxIds: c.boxIds.filter((x) => {
        if (!known.has(x) || seen.has(x)) return false
        seen.add(x)
        return true
      }),
    })),
  }))
  const out = tidy(cleaned)
  for (const id of ids)
    if (!seen.has(id))
      out.push({ id: newRowId(), cols: [{ w: 1, boxIds: [id] }] })
  return out
}

/** A one-row-per-box arrangement (the start for pages that have no boxes). */
export const singleRows = (ids: readonly string[]): GridRow[] =>
  ids.map((id) => ({ id: newRowId(), cols: [{ w: 1, boxIds: [id] }] }))

export type BoxGeom = Pick<PaperBox, 'id' | 'x' | 'y' | 'w'>

/**
 * Old free boxes into rows (migration, on open, nothing is lost). Boxes whose
 * vertical ranges overlap by at least 30 % share a row (up to 3, ordered by
 * x, fractions from their widths); more go to the next row. Every block stays
 * in its box, only the boxes are arranged. `heights` (mm) default to a guess.
 */
export function migrateToRows(
  boxes: readonly BoxGeom[],
  heights: Readonly<Record<string, number>> = {},
): GridRow[] {
  const h = (b: BoxGeom) => Math.max(1, heights[b.id] ?? DEFAULT_H)
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x)
  const groups: BoxGeom[][] = []
  let top = 0
  let bottom = 0
  for (const b of sorted) {
    const cur = groups[groups.length - 1]
    if (cur && cur.length < MAX_COLS) {
      const overlap = Math.min(bottom, b.y + h(b)) - Math.max(top, b.y)
      const base = Math.min(bottom - top, h(b))
      if (overlap > 0 && overlap / base >= 0.3) {
        cur.push(b)
        top = Math.min(top, b.y)
        bottom = Math.max(bottom, b.y + h(b))
        continue
      }
    }
    groups.push([b])
    top = b.y
    bottom = b.y + h(b)
  }
  return groups.map((g) => {
    const byX = [...g].sort((a, b) => a.x - b.x)
    const fracs = normaliseFracs(byX.map((b) => b.w))
    return {
      id: newRowId(),
      y: round(Math.min(...g.map((b) => b.y))),
      cols: byX.map((b, i) => ({ w: round(fracs[i]), boxIds: [b.id] })),
    }
  })
}

/**
 * Where every box sits (mm). Rows go top to bottom; a row starts at its own
 * `y` or just under the row above, whichever is lower; its height is its
 * tallest column. A row never crosses the gap between sheets: if it fits on a
 * sheet but not in what is left of this one, the whole row starts on the next
 * sheet (a row taller than a sheet runs on, its boxes paginate inside).
 */
export function layoutRows(
  rows: readonly GridRow[],
  heights: Readonly<Record<string, number>>,
  g: Geometry,
): Map<string, Rect & { h: number }> {
  const out = new Map<string, Rect & { h: number }>()
  const contentW = g.sheetW - g.left - g.right
  const usable = g.sheetH - g.top - g.bottom
  const period = g.sheetH + g.gapMm
  let y = g.top
  for (const row of rows) {
    const n = row.cols.length
    if (n === 0) continue
    const avail = contentW - COL_GAP * (n - 1)
    const free = isFreeRow(row) && row.cols[0].boxIds.length >= 1
    const colH = row.cols.map(
      (c) =>
        sum(c.boxIds.map((id) => Math.max(1, heights[id] ?? DEFAULT_H))) +
        ROW_GAP * Math.max(0, c.boxIds.length - 1),
    )
    const rowH = Math.max(...colH)
    let start = Math.max(y, row.y ?? 0)
    const sheet = Math.max(0, Math.floor((start + 1e-6) / period))
    const end = sheet * period + g.sheetH - g.bottom
    if (start >= end - 1e-6 || (rowH <= usable && start + rowH > end))
      start = (sheet + 1) * period + g.top
    let x = g.left
    if (free) {
      // A free box: at its own left edge, as wide as it was set or as its text.
      const id0 = row.cols[0].boxIds[0]
      const maxW = freeMaxW(g, row.x!)
      const w = Math.min(
        row.wmm ?? (row.auto ? (g.autoW?.[id0] ?? FREE_MIN_W) : maxW),
        g.sheetW - row.x!,
      )
      x = row.x!
      let yy = start
      for (const id of row.cols[0].boxIds) {
        const bh = Math.max(1, heights[id] ?? DEFAULT_H)
        out.set(id, { x: round(x), y: round(yy), w: round(w), h: bh })
        yy += bh + ROW_GAP
      }
      y = start + rowH + ROW_GAP
      continue
    }
    row.cols.forEach((c) => {
      const w = c.w * avail
      let yy = start
      for (const id of c.boxIds) {
        const bh = Math.max(1, heights[id] ?? DEFAULT_H)
        out.set(id, { x: round(x), y: round(yy), w: round(w), h: bh })
        yy += bh + ROW_GAP
      }
      x += w + COL_GAP
    })
    y = start + rowH + ROW_GAP
  }
  return out
}

export type Zone = 'left' | 'right' | 'top' | 'bottom'

/**
 * The drop zone for a point over a box (Notion's edges): the left or right
 * third adds a column beside it, the top or bottom quarter stacks. The
 * nearest edge wins where they meet. `u` and `v` are 0..1 across the box.
 */
export function zoneOf(u: number, v: number): Zone {
  const cand: [Zone, number][] = [
    ['left', u / (1 / 3)],
    ['right', (1 - u) / (1 / 3)],
    ['top', v / (1 / 4)],
    ['bottom', (1 - v) / (1 / 4)],
  ]
  cand.sort((a, b) => a[1] - b[1])
  return cand[0][0]
}

export interface Dropped {
  rows: GridRow[]
  /** The wanted spot was full: the box went into a new row instead. */
  full: boolean
}

/**
 * Drops `id` on a zone of `target`. The box leaves its old place first. A
 * full row (3 columns) or column (2 stacked) turns into a new row above or
 * below, and `full` says so (the preview shows "Row is full").
 */
export function insertAt(
  rows: readonly GridRow[],
  target: string,
  zone: Zone,
  id: string,
): Dropped {
  if (target === id) return { rows: clone(rows), full: false }
  const base = clone(removeBox(rows, id))
  const at = find(base, target)
  if (!at) return { rows: [...base, ...singleRows([id])], full: false }
  const row = base[at.r]
  const newRow = (below: boolean): Dropped => {
    base.splice(below ? at.r + 1 : at.r, 0, {
      id: newRowId(),
      cols: [{ w: 1, boxIds: [id] }],
    })
    return { rows: base, full: true }
  }
  if (zone === 'left' || zone === 'right') {
    if (row.cols.length >= MAX_COLS) return newRow(zone === 'right')
    const n = row.cols.length
    const share = 1 / (n + 1)
    const cols = row.cols.map((c) => ({ ...c, w: c.w * (1 - share) }))
    cols.splice(zone === 'left' ? at.c : at.c + 1, 0, {
      w: share,
      boxIds: [id],
    })
    const fracs = normaliseFracs(cols.map((c) => c.w))
    row.cols = cols.map((c, i) => ({ ...c, w: round(fracs[i]) }))
    return { rows: base, full: false }
  }
  const col = row.cols[at.c]
  if (col.boxIds.length >= MAX_STACK) return newRow(zone === 'bottom')
  col.boxIds.splice(zone === 'top' ? at.s : at.s + 1, 0, id)
  return { rows: base, full: false }
}

/**
 * Puts `id` in a new row above (index) `before` rows. With `free` it is a
 * free box at that left edge: `wmm` a width set by the user, else `auto`
 * (as wide as its text).
 */
export function insertRow(
  rows: readonly GridRow[],
  index: number,
  id: string,
  y?: number,
  free?: { x: number; wmm?: number },
): GridRow[] {
  const base = clone(removeBox(rows, id))
  const row: GridRow = { id: newRowId(), cols: [{ w: 1, boxIds: [id] }] }
  if (y !== undefined) row.y = round(y)
  if (free) {
    row.x = round(free.x)
    if (free.wmm !== undefined) row.wmm = round(free.wmm)
    else row.auto = true
  }
  base.splice(Math.max(0, Math.min(base.length, index)), 0, row)
  return base
}

/** Where a divider snaps (fractions of the whole row), within 3 %. */
const SNAPS = [1 / 3, 1 / 2, 2 / 3]

/**
 * Moves the divider after column `i` to `at` (a fraction of the whole row,
 * measured from the row's left edge). Only the two columns beside it change;
 * each stays at least MIN_FRAC; it snaps to 1/3, 1/2 and 2/3 within 3 %.
 */
export function resizeCols(
  row: GridRow,
  i: number,
  at: number,
  snap = true,
): GridRow {
  if (i < 0 || i + 1 >= row.cols.length) return row
  const before = sum(row.cols.slice(0, i).map((c) => c.w))
  const span = row.cols[i].w + row.cols[i + 1].w
  let edge = at
  if (snap) {
    const hit = SNAPS.find((s) => Math.abs(s - edge) <= 0.03)
    if (hit !== undefined) edge = hit
  }
  const left = Math.min(span - MIN_FRAC, Math.max(MIN_FRAC, edge - before))
  const cols = row.cols.map((c, j) =>
    j === i
      ? { ...c, w: round(left) }
      : j === i + 1
        ? { ...c, w: round(span - left) }
        : c,
  )
  return { ...row, cols }
}

/** Equal widths in a row (double tap on a divider). */
export function equalRow(row: GridRow): GridRow {
  const f = equalFracs(row.cols.length)
  return { ...row, cols: row.cols.map((c, i) => ({ ...c, w: round(f[i]) })) }
}

export interface Preset {
  id: string
  /** Column widths, and how many boxes are stacked in each. */
  cols: { w: number; stack: number }[]
}

/** The Windows-style layouts (box ⋯ › Layout). */
export const PRESETS: readonly Preset[] = [
  { id: 'one', cols: [{ w: 1, stack: 1 }] },
  {
    id: 'two',
    cols: [
      { w: 0.5, stack: 1 },
      { w: 0.5, stack: 1 },
    ],
  },
  {
    id: 'thirdTwo',
    cols: [
      { w: 1 / 3, stack: 1 },
      { w: 2 / 3, stack: 1 },
    ],
  },
  {
    id: 'twoThirds',
    cols: [
      { w: 2 / 3, stack: 1 },
      { w: 1 / 3, stack: 1 },
    ],
  },
  {
    id: 'three',
    cols: [
      { w: 1 / 3, stack: 1 },
      { w: 1 / 3, stack: 1 },
      { w: 1 / 3, stack: 1 },
    ],
  },
  {
    id: 'quad',
    cols: [
      { w: 0.5, stack: 2 },
      { w: 0.5, stack: 2 },
    ],
  },
  {
    id: 'six',
    cols: [
      { w: 1 / 3, stack: 2 },
      { w: 1 / 3, stack: 2 },
      { w: 1 / 3, stack: 2 },
    ],
  },
]

/** How many boxes a preset holds. */
export const cellCount = (p: Preset) => sum(p.cols.map((c) => c.stack))

/**
 * Re-arranges the row holding `anchor` as `preset`. Its boxes fill the cells
 * in reading order; cells left over take `fresh` ids (the caller makes those
 * boxes; `cellCount(preset) - boxes in the row` of them); boxes that do not
 * fit go to a new row below, as they were. Nothing is lost.
 */
export function applyPreset(
  rows: readonly GridRow[],
  anchor: string,
  preset: Preset,
  fresh: readonly string[],
): GridRow[] {
  const base = clone(rows)
  const at = find(base, anchor)
  if (!at) return base
  const row = base[at.r]
  const ids = [...rowBoxIds(row), ...fresh]
  let i = 0
  const cols = preset.cols.map((p) => {
    const boxIds = ids.slice(i, i + p.stack)
    i += p.stack
    return { w: p.w, boxIds }
  })
  const rest = ids.slice(i)
  row.cols = cols.filter((c) => c.boxIds.length > 0)
  const out = tidy(base)
  if (rest.length) {
    const from = out.findIndex((r) => r.id === row.id)
    const extra: GridRow = {
      id: newRowId(),
      cols: rest.slice(0, MAX_COLS).map((id) => ({ w: 1, boxIds: [id] })),
    }
    // More than three left over: the rest each get a row.
    const more = rest.slice(MAX_COLS).map((id) => ({
      id: newRowId(),
      cols: [{ w: 1, boxIds: [id] }],
    }))
    out.splice(from + 1, 0, ...[extra, ...more].map((r) => tidy([r])[0]))
  }
  return out
}

/** How many new boxes a preset needs for the row holding `anchor`. */
export function freshNeeded(
  rows: readonly GridRow[],
  anchor: string,
  preset: Preset,
): number {
  const at = find(rows, anchor)
  if (!at) return 0
  return Math.max(0, cellCount(preset) - rowBoxIds(rows[at.r]).length)
}

/**
 * The places a layout gives the boxes, as stored on each box (old clients and
 * exports read these). A box that is as wide as its text stores the widest it
 * may grow, so an export wraps exactly where the screen does. The default box
 * keeps its own stored place.
 */
export function placesOf(
  rows: readonly GridRow[],
  heights: Readonly<Record<string, number>>,
  g: Geometry,
  skip = 'main',
): { id: string; patch: { x: number; y: number; w: number } }[] {
  const auto = new Set(
    rows
      .filter((r) => isFreeRow(r) && r.auto && r.wmm === undefined)
      .flatMap((r) => r.cols[0].boxIds),
  )
  const out: { id: string; patch: { x: number; y: number; w: number } }[] = []
  for (const [id, rc] of layoutRows(rows, heights, g))
    if (id !== skip)
      out.push({
        id,
        patch: {
          x: rc.x,
          y: rc.y,
          w: auto.has(id) ? round(freeMaxW(g, rc.x)) : rc.w,
        },
      })
  return out
}
