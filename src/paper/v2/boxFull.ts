import type { GridRow, PaperBox } from '../../core/types'
import {
  isFreeRow,
  MAX_COLS,
  newRowId,
  normaliseFracs,
  type Geometry,
} from '../grid'

/** What a box remembers while it is full width (so turning it off puts it back). */
export type FullMemo = NonNullable<PaperBox['full']>

const round = (v: number) => Math.round(v * 100) / 100
const rowOf = (rows: readonly GridRow[], id: string) =>
  rows.findIndex((r) => r.cols.some((c) => c.boxIds.includes(id)))

/**
 * TB-27 Full width, on. In a grid the box leaves its column and gets a row of
 * its own under that row, so it spans every column; a free box takes the
 * page's text width from the left margin. Returns the new rows and what to
 * remember, or null when the box is not in the rows.
 */
export function widen(
  rows: readonly GridRow[],
  id: string,
  geo: Pick<Geometry, 'sheetW' | 'left' | 'right'>,
): { rows: GridRow[]; memo: FullMemo } | null {
  const i = rowOf(rows, id)
  if (i < 0) return null
  const row = rows[i]
  if (isFreeRow(row)) {
    const memo: FullMemo = { x: row.x }
    if (row.wmm !== undefined) memo.wmm = row.wmm
    if (row.auto) memo.auto = true
    const next: GridRow = {
      ...row,
      x: geo.left,
      wmm: round(geo.sheetW - geo.left - geo.right),
    }
    delete next.auto
    return { rows: rows.map((r, k) => (k === i ? next : r)), memo }
  }
  // Already across the whole row: nothing moves, the switch is just on.
  if (row.cols.length === 1) return { rows: [...rows], memo: {} }
  const ci = row.cols.findIndex((c) => c.boxIds.includes(id))
  const col = row.cols[ci]
  const kept = row.cols
    .map((c, k) =>
      k === ci ? { ...c, boxIds: c.boxIds.filter((b) => b !== id) } : c,
    )
    .filter((c) => c.boxIds.length > 0)
  const fracs = normaliseFracs(kept.map((c) => c.w))
  const rest = kept.map((c, k) => ({ ...c, w: round(fracs[k]) }))
  const nearest = rest[Math.min(ci, rest.length - 1)]
  const memo: FullMemo = { beside: nearest?.boxIds[0], w: col.w, at: ci }
  const own: GridRow = { id: newRowId(), cols: [{ w: 1, boxIds: [id] }] }
  const out = rows.flatMap((r, k) =>
    k === i ? (rest.length ? [{ ...r, cols: rest }, own] : [own]) : [r],
  )
  return { rows: out, memo }
}

/** Full width, off: back to the column it came from (or where it is, if that is gone). */
export function narrow(
  rows: readonly GridRow[],
  id: string,
  memo: FullMemo,
): GridRow[] {
  const i = rowOf(rows, id)
  if (i < 0) return [...rows]
  const row = rows[i]
  if (isFreeRow(row) && memo.x !== undefined) {
    const next: GridRow = { ...row, x: memo.x }
    if (memo.wmm !== undefined) next.wmm = memo.wmm
    else delete next.wmm
    if (memo.auto) next.auto = true
    return rows.map((r, k) => (k === i ? next : r))
  }
  if (!memo.beside || row.cols.length !== 1 || row.cols[0].boxIds.length !== 1)
    return [...rows]
  const j = rowOf(rows, memo.beside)
  if (j < 0 || j === i || rows[j].cols.length >= MAX_COLS) return [...rows]
  const w = Math.min(0.8, Math.max(0.2, memo.w ?? 0.5))
  const cols = rows[j].cols.map((c) => ({ ...c, w: c.w * (1 - w) }))
  cols.splice(Math.min(memo.at ?? cols.length, cols.length), 0, {
    w,
    boxIds: [id],
  })
  const fracs = normaliseFracs(cols.map((c) => c.w))
  const merged = cols.map((c, k) => ({ ...c, w: round(fracs[k]) }))
  return rows.flatMap((r, k) =>
    k === i ? [] : k === j ? [{ ...r, cols: merged }] : [r],
  )
}

/** Does the box still span its whole row? A box in a row of two or three columns does not. */
export const stillFull = (rows: readonly GridRow[], id: string): boolean => {
  const i = rowOf(rows, id)
  return i < 0 || rows[i].cols.length === 1
}
