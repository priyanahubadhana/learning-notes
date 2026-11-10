import type { GridRow } from '../core/types'
import { isGridRows } from '../core/gridRows'
import {
  cellCount,
  find,
  MAX_COLS,
  newRowId,
  normaliseFracs,
  PRESETS,
  reconcile,
  removeBox,
  rowBoxIds,
  type Preset,
} from './grid'

/**
 * Layout Assist (owner bug batch 2, items 7 and 10; plan
 * docs/plans/layout-assist-plan.md). Pure maths, no DOM. Choosing a layout
 * never creates empty boxes: the chosen row is redrawn as the layout's
 * zones, and each zone is filled with an existing box, a "+ New box" or
 * left empty (empty zones collapse when the layout is finished).
 */

/** A zone holding "+ New box": a box is made when the layout is finished. */
export const NEW = 'new'

/** A zone: a box id, NEW, or null (left empty). */
export type SlotValue = string | null

export interface Draft {
  /** The row being redrawn, and the box the person started from. */
  rowId: string
  anchor: string
  preset: Preset
  /** One value per zone, in reading order (column by column, top to bottom). */
  slots: SlotValue[]
  /** The boxes the row held when the step began (none is ever deleted). */
  rowBoxes: string[]
}

const round2 = (v: number) => Math.round(v * 100) / 100

export const presetById = (id: string): Preset | undefined =>
  PRESETS.find((p) => p.id === id)

/** The zones of a preset as (column, stack) pairs in reading order. */
export function zonesOf(p: Preset): { col: number; stack: number }[] {
  return p.cols.flatMap((c, col) =>
    Array.from({ length: c.stack }, (_, stack) => ({ col, stack })),
  )
}

/**
 * Starts a layout for the row holding `anchor`: the anchor goes in `zone`,
 * the row's other boxes keep their reading order in the free zones, the rest
 * of the zones are empty. Returns null for an unknown preset or box.
 */
export function startLayout(
  rows: readonly GridRow[],
  anchor: string,
  presetId: string,
  zone: number,
): Draft | null {
  const preset = presetById(presetId)
  const at = find(rows, anchor)
  if (!preset || !at) return null
  const n = cellCount(preset)
  const z = Math.max(0, Math.min(n - 1, zone))
  const row = rows[at.r]
  const rowBoxes = rowBoxIds(row)
  const others = rowBoxes.filter((id) => id !== anchor)
  const slots: SlotValue[] = Array.from({ length: n }, () => null)
  slots[z] = anchor
  let i = 0
  for (const id of others) {
    while (i < n && slots[i] !== null) i++
    if (i < n) slots[i++] = id
  }
  return { rowId: row.id, anchor, preset, slots, rowBoxes }
}

/**
 * Puts `value` in zone `i`. A box already in another zone swaps places with
 * what was here; a new box or an empty zone just replaces it.
 */
export function fillSlot(d: Draft, i: number, value: SlotValue): Draft {
  if (i < 0 || i >= d.slots.length) return d
  const slots = [...d.slots]
  const prev = slots[i]
  if (value !== null && value !== NEW) {
    const j = slots.indexOf(value)
    if (j === i) return d
    if (j >= 0) slots[j] = prev
  }
  slots[i] = value
  return { ...d, slots }
}

/** The next zone that has nothing in it (the active one), or -1. */
export const nextEmpty = (d: Draft, from = 0): number => {
  const n = d.slots.length
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n
    if (d.slots[i] === null) return i
  }
  return -1
}

/**
 * The rows after the layout. `name(i, value)` gives the id a zone shows:
 * `null` leaves it out (finish), a placeholder id keeps the zone (preview).
 * Boxes pulled in from other rows leave them; boxes of the row that found
 * no zone move to new rows right below. Nothing is deleted.
 */
export function buildRows(
  rows: readonly GridRow[],
  d: Draft,
  name: (i: number, v: SlotValue) => string | null,
): GridRow[] {
  const placed = d.slots.filter((v): v is string => v !== null && v !== NEW)
  let base: GridRow[] = rows.map((r) => ({
    ...r,
    cols: r.cols.map((c) => ({ ...c, boxIds: [...c.boxIds] })),
  }))
  // Boxes from other rows leave them first (emptied rows vanish).
  for (const id of placed)
    if (!d.rowBoxes.includes(id)) base = removeBox(base, id)
  const at = base.findIndex((r) => r.id === d.rowId)
  const old = base[at]
  let i = 0
  const cols = d.preset.cols
    .map((p) => {
      const ids: string[] = []
      for (let s = 0; s < p.stack; s++, i++) {
        const id = name(i, d.slots[i])
        if (id) ids.push(id)
      }
      return { w: p.w, boxIds: ids }
    })
    .filter((c) => c.boxIds.length > 0)
  const fracs = normaliseFracs(cols.map((c) => c.w))
  const row: GridRow | null = cols.length
    ? {
        id: d.rowId,
        ...(old?.y !== undefined ? { y: old.y } : {}),
        cols: cols.map((c, k) => ({ ...c, w: round2(fracs[k]) })),
      }
    : null
  // The row's own boxes that found no zone go to new rows below it.
  const left = d.rowBoxes.filter((id) => !placed.includes(id))
  const extra: GridRow[] = []
  for (let k = 0; k < left.length; k += MAX_COLS) {
    const part = left.slice(k, k + MAX_COLS)
    const f = normaliseFracs(part.map(() => 1))
    extra.push({
      id: newRowId(),
      cols: part.map((id, j) => ({ w: round2(f[j]), boxIds: [id] })),
    })
  }
  const out = base.slice()
  out.splice(
    at < 0 ? out.length : at,
    at < 0 ? 0 : 1,
    ...(row ? [row] : []),
    ...extra,
  )
  return out
}

/** The rows to show while choosing: empty zones stay as placeholders. */
export const previewRows = (rows: readonly GridRow[], d: Draft): GridRow[] =>
  buildRows(rows, d, (i, v) =>
    v === null ? `slot:${i}` : v === NEW ? `new:${i}` : v,
  )

/**
 * The finished rows. `fresh` are ids for the "+ New box" zones, in order.
 * Returns null if the result is not a valid grid or a box would be lost.
 */
export function finish(
  rows: readonly GridRow[],
  d: Draft,
  fresh: readonly string[],
): { rows: GridRow[]; newCount: number } | null {
  let k = 0
  const out = buildRows(rows, d, (_i, v) =>
    v === null ? null : v === NEW ? (fresh[k++] ?? null) : v,
  )
  const had = rows.flatMap(rowBoxIds)
  const have = new Set(out.flatMap(rowBoxIds))
  if (!isGridRows(out) || had.some((id) => !have.has(id))) return null
  return { rows: out, newCount: k }
}

/** How many "+ New box" zones a draft holds. */
export const newCount = (d: Draft): number =>
  d.slots.filter((v) => v === NEW).length

/**
 * Every page of a notebook (item 10): the page's boxes (all but the page's
 * own text) in reading order, `cellCount` to a row in the layout; the last
 * row collapses the zones it does not need. The page text stays on top.
 */
export function arrangeAll(
  rows: readonly GridRow[],
  presetId: string,
  mainId = 'main',
): GridRow[] | null {
  const preset = presetById(presetId)
  if (!preset) return null
  const ids = rows.flatMap(rowBoxIds)
  const rest = ids.filter((id) => id !== mainId)
  const n = cellCount(preset)
  const out: GridRow[] = []
  if (ids.includes(mainId))
    out.push({ id: newRowId(), cols: [{ w: 1, boxIds: [mainId] }] })
  for (let k = 0; k < rest.length; k += n) {
    const chunk = rest.slice(k, k + n)
    let i = 0
    const cols = preset.cols
      .map((p) => {
        const boxIds = chunk.slice(i, i + p.stack)
        i += p.stack
        return { w: p.w, boxIds }
      })
      .filter((c) => c.boxIds.length > 0)
    const fracs = normaliseFracs(cols.map((c) => c.w))
    out.push({
      id: newRowId(),
      cols: cols.map((c, j) => ({ ...c, w: round2(fracs[j]) })),
    })
  }
  const clean = reconcile(out, ids)
  return isGridRows(clean) ? clean : null
}

const RECENT = 'learning-notes:layout.recent'

/** The layouts used lately, newest first (this device). */
export function recentLayouts(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT) ?? '[]') as unknown
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && !!presetById(x))
      : []
  } catch {
    return []
  }
}

export function noteRecentLayout(id: string): void {
  try {
    const next = [id, ...recentLayouts().filter((x) => x !== id)].slice(0, 4)
    localStorage.setItem(RECENT, JSON.stringify(next))
  } catch {
    // Storage blocked: the order simply is not remembered.
  }
}

/** The presets with the recent ones first. */
export function orderedPresets(recent: readonly string[]): Preset[] {
  const first = recent.flatMap((id) => presetById(id) ?? [])
  return [...first, ...PRESETS.filter((p) => !recent.includes(p.id))]
}

/** The grid as drawn now: the paper tells the hook, the assist reads it. */
export interface GridInfo {
  rows: GridRow[]
  places: import('./boxService').BoxPatch[]
  /** Measured box heights (mm). */
  heights: Record<string, number>
  geo: import('./grid').Geometry
}
