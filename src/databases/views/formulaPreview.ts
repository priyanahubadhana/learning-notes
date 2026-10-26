import type { DbColumn } from '../../core/types'
import { resolveRows, type DatabaseData } from '../databaseQuery'
import type { FValue } from '../formula/formulaValue'

/** Id of the stand-in column a new formula is tried out in. */
const PREVIEW_ID = 'formula-preview'

/**
 * Works a formula out for the first row, as it would show in the table
 * (before it is saved). `columnId` is the formula column being edited, or
 * undefined for a new one. Null when the database has no rows yet.
 */
export function previewFormula(
  data: DatabaseData,
  formula: string,
  now: number,
  columnId?: string,
): { title: string; value: FValue } | null {
  const main = data.databases.get(data.databaseId)
  if (!main || main.rows.length === 0) return null
  const id = columnId ?? PREVIEW_ID
  const base = main.columns.find((c) => c.id === columnId)
  const probe: DbColumn = {
    id,
    databaseId: main.database.id,
    name: base?.name ?? '',
    type: 'formula',
    config: { formula },
    order: base?.order ?? '~',
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
  }
  const columns = base
    ? main.columns.map((c) => (c.id === id ? probe : c))
    : [...main.columns, probe]
  // Only the first row is needed: a copy with just that row is quicker.
  const databases = new Map(data.databases)
  databases.set(data.databaseId, {
    ...main,
    columns,
    rows: main.rows.slice(0, 1),
  })
  const [row] = resolveRows({ ...data, databases }, now)
  return { title: row.page.title, value: row.values[id] ?? null }
}
