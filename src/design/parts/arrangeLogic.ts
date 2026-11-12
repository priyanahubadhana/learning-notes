import { moveItem } from './drag/reorder'

/** Pure list changes for the Arrange sheet, so they can be tested without a screen. */
export interface HasId {
  id: string
}

export function moveRow<T extends HasId>(
  rows: T[],
  id: string,
  to: number,
): T[] {
  const from = rows.findIndex((r) => r.id === id)
  return from < 0 ? rows : moveItem(rows, from, to)
}

export function removeRow<T extends HasId>(
  rows: T[],
  id: string,
): { rows: T[]; removed: T | null; index: number } {
  const index = rows.findIndex((r) => r.id === id)
  if (index < 0) return { rows, removed: null, index: -1 }
  return {
    rows: rows.filter((r) => r.id !== id),
    removed: rows[index],
    index,
  }
}

/** Puts a removed row back at its exact place (or the end if the list got shorter). */
export function restoreRow<T extends HasId>(
  rows: T[],
  row: T,
  index: number,
): T[] {
  if (rows.some((r) => r.id === row.id)) return rows
  const next = [...rows]
  next.splice(Math.max(0, Math.min(next.length, index)), 0, row)
  return next
}

/** Chips for the preview well: up to `max` labels and how many more. */
export function previewChips(labels: string[], max = 8) {
  return { shown: labels.slice(0, max), more: Math.max(0, labels.length - max) }
}
