import type { DbColumn, JsonObject } from '../../core/types'
import { rowCellText } from '../cellDisplay'
import { choiceOptions } from '../columnTypes'
import type { ResolvedRow } from '../databaseQuery'

/**
 * Table and List grouping: rows split by one column's shown text. The
 * column is saved in the view (`config.groupBy`, a column id). Rows with
 * no value form the last group. Rows keep the order the view gave them.
 */

export interface RowGroup {
  /** The shown text; '' = no value. */
  key: string
  rows: ResolvedRow[]
}

/** Columns whose values make sense as groups (not lists of other rows). */
export function groupByColumns(columns: readonly DbColumn[]): DbColumn[] {
  return columns.filter(
    (c) =>
      c.type !== 'relation' && c.type !== 'rollup' && c.type !== 'noteLink',
  )
}

/** The column the view groups by, if it still exists. */
export function viewGroupColumn(
  config: JsonObject,
  columns: readonly DbColumn[],
): DbColumn | undefined {
  return typeof config.groupBy === 'string'
    ? groupByColumns(columns).find((c) => c.id === config.groupBy)
    : undefined
}

/** Sets (or with null clears) the grouping column. */
export function withGroup(
  config: JsonObject,
  columnId: string | null,
): JsonObject {
  const next = { ...config }
  if (columnId) next.groupBy = columnId
  else delete next.groupBy
  return next
}

/**
 * Rows split by `column`. Choice columns list groups in option order;
 * other columns in order of first appearance. No value comes last.
 */
export function groupRowsByColumn(
  rows: readonly ResolvedRow[],
  column: DbColumn,
): RowGroup[] {
  const map = new Map<string, ResolvedRow[]>()
  for (const row of rows) {
    const key = rowCellText(row, column).trim()
    const list = map.get(key)
    if (list) list.push(row)
    else map.set(key, [row])
  }
  const order = choiceOptions(column).map((o) => o.name)
  const keys = [...map.keys()].filter((k) => k !== '')
  if (order.length > 0) {
    const rank = (k: string) => {
      const i = order.indexOf(k)
      return i < 0 ? order.length : i
    }
    keys.sort((a, b) => rank(a) - rank(b))
  }
  if (map.has('')) keys.push('')
  return keys.map((key) => ({ key, rows: map.get(key)! }))
}

/** One drawn line of a grouped list: a group heading or a row. */
export type GroupedItem =
  | { kind: 'group'; key: string; count: number }
  | { kind: 'row'; row: ResolvedRow }

/** Groups flattened into lines; a collapsed group shows only its heading. */
export function flattenGroups(
  groups: readonly RowGroup[],
  collapsed: ReadonlySet<string>,
): GroupedItem[] {
  const items: GroupedItem[] = []
  for (const g of groups) {
    items.push({ kind: 'group', key: g.key, count: g.rows.length })
    if (!collapsed.has(g.key)) {
      for (const row of g.rows) items.push({ kind: 'row', row })
    }
  }
  return items
}
