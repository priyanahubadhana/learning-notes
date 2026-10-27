import type { DbColumn, JsonObject, JsonValue } from '../../core/types'
import { choiceOptions, getColumnType, type ChoiceOption } from '../columnTypes'
import type { ResolvedRow } from '../databaseQuery'

/**
 * Board view rules, kept apart from the screen: which columns a board can
 * group by, which column it uses, how rows fall into groups, and which
 * values a card shows. Settings live in the view (`DbView.config`):
 * `groupBy` (column id) and `cardColumns` (column ids shown on cards).
 */

/** Values shown on a card unless the user picks others. */
const DEFAULT_CARD_VALUES = 3

/** Key of the group for rows with no value ("No Status"). */
export const NO_VALUE = ''

/** Columns a board can group by: Choice columns (one value per row). */
export function groupableColumns(columns: readonly DbColumn[]): DbColumn[] {
  return columns.filter((c) => c.type === 'choice')
}

/** The column the board groups by: the saved one, else the first Choice. */
export function boardGroupColumn(
  config: JsonObject,
  columns: readonly DbColumn[],
): DbColumn | undefined {
  const groupable = groupableColumns(columns)
  return groupable.find((c) => c.id === config.groupBy) ?? groupable[0]
}

export function withGroupBy(config: JsonObject, columnId: string): JsonObject {
  return { ...config, groupBy: columnId }
}

export interface BoardGroup {
  /** Option id, or NO_VALUE. */
  key: string
  option?: ChoiceOption
  rows: ResolvedRow[]
}

/** The option id a row stores in `column` (NO_VALUE if none or unknown). */
export function groupKeyOf(row: ResolvedRow, column: DbColumn): string {
  const id = getColumnType('choice')!.read(row.page.values?.[column.id], column)
  return typeof id === 'string' ? id : NO_VALUE
}

/**
 * Rows split by `column`: one group per option (in option order, empty
 * ones too), with the rows that have no value first. Rows keep their order.
 */
export function groupRows(
  rows: readonly ResolvedRow[],
  column: DbColumn,
): BoardGroup[] {
  const groups: BoardGroup[] = [
    { key: NO_VALUE, rows: [] },
    ...choiceOptions(column).map((option) => ({
      key: option.id,
      option,
      rows: [],
    })),
  ]
  const byKey = new Map(groups.map((g) => [g.key, g]))
  for (const row of rows) byKey.get(groupKeyOf(row, column))!.rows.push(row)
  return groups
}

/** The value to write when a card is moved to the group `key`. */
export const groupValue = (key: string): JsonValue =>
  key === NO_VALUE ? null : key

/**
 * Columns whose values a card shows (never the grouping column): the ones
 * picked in "Card shows", else the first few.
 */
export function cardColumns(
  config: JsonObject,
  columns: readonly DbColumn[],
  groupColumnId: string | undefined,
): DbColumn[] {
  const others = columns.filter((c) => c.id !== groupColumnId)
  if (!Array.isArray(config.cardColumns)) {
    return others.slice(0, DEFAULT_CARD_VALUES)
  }
  const picked = new Set(config.cardColumns)
  return others.filter((c) => picked.has(c.id))
}

/** Shows or hides a column's value on the cards. */
export function withCardColumn(
  config: JsonObject,
  columns: readonly DbColumn[],
  groupColumnId: string | undefined,
  columnId: string,
  shown: boolean,
): JsonObject {
  const ids = cardColumns(config, columns, groupColumnId)
    .map((c) => c.id)
    .filter((id) => id !== columnId)
  if (shown) ids.push(columnId)
  return { ...config, cardColumns: ids }
}
