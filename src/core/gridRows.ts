import type { GridRow } from './types'

/** Limits of the box grid (item 26): shared with backups and sync checks. */
export const MAX_COLS = 3
export const MAX_STACK = 2
/** The narrowest a column may be, as a fraction of the row. */
export const MIN_FRAC = 0.25

/** Shape check for stored rows (backups and sync): sizes, fractions, unique ids. */
export function isGridRows(v: unknown): v is GridRow[] {
  if (!Array.isArray(v) || v.length > 500) return false
  const seen = new Set<string>()
  for (const row of v as Record<string, unknown>[]) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string')
      return false
    if (
      row.y !== undefined &&
      !(typeof row.y === 'number' && Number.isFinite(row.y))
    )
      return false
    const cols = row.cols
    if (!Array.isArray(cols) || cols.length < 1 || cols.length > MAX_COLS)
      return false
    let total = 0
    for (const c of cols as Record<string, unknown>[]) {
      if (!c || typeof c !== 'object') return false
      const w = c.w
      if (typeof w !== 'number' || !(w >= MIN_FRAC - 0.01) || w > 1.01)
        return false
      total += w
      const ids = c.boxIds
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_STACK)
        return false
      for (const id of ids) {
        if (typeof id !== 'string' || seen.has(id)) return false
        seen.add(id)
      }
    }
    if (Math.abs(total - 1) > 0.02) return false
  }
  return true
}
