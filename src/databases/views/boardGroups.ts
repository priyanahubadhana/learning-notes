import type { DbColumn, JsonObject, JsonValue } from '../../core/types'
import { choiceOptions, getColumnType, type ChoiceOption } from '../columnTypes'
import type { ResolvedRow } from '../databaseQuery'
import type { RowPlace } from '../databaseService'

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
  return columns.filter(
    (c) => c.type === 'choice' || c.type === 'trackerStatus',
  )
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

/**
 * The option id a row stores in `column` (NO_VALUE if none or unknown). A
 * Study tracker's Status is the one the lesson shows (set by hand or Auto).
 */
export function groupKeyOf(row: ResolvedRow, column: DbColumn): string {
  if (column.type === 'trackerStatus') return row.tracker?.status ?? NO_VALUE
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
 * The value to write when `row` (none: a new lesson, which starts as Not
 * started) goes to group `key`. A Study tracker lesson dropped on the
 * column of its automatic Status goes back to Auto (nothing stored).
 */
export function moveValue(
  column: DbColumn,
  key: string,
  row?: ResolvedRow,
): JsonValue {
  if (column.type === 'trackerStatus') {
    const auto = row ? row.tracker?.auto : 'notStarted'
    return key === auto ? null : key
  }
  return groupValue(key)
}

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

/** A card being dropped: into group `key`, at `index` (counted without it). */
export interface CardMove {
  rowId: string
  key: string
  index: number
}

/** Where a card is now: its group and index (null if not on the board). */
export function cardPlace(
  groups: readonly BoardGroup[],
  rowId: string,
): CardMove | null {
  for (const group of groups) {
    const index = group.rows.findIndex((r) => r.page.id === rowId)
    if (index >= 0) return { rowId, key: group.key, index }
  }
  return null
}

/** The groups with one card moved (for the drag preview and the drop). */
export function withCardMoved(
  groups: readonly BoardGroup[],
  move: CardMove,
): BoardGroup[] {
  const from = cardPlace(groups, move.rowId)
  if (!from) return [...groups]
  const card = groups.find((g) => g.key === from.key)!.rows[from.index]
  return groups.map((group) => {
    const rows = group.rows.filter((r) => r.page.id !== move.rowId)
    if (group.key === move.key) {
      rows.splice(Math.min(move.index, rows.length), 0, card)
    }
    return { ...group, rows }
  })
}

/**
 * The row a dropped card goes next to (before the card now at its place,
 * else after the one above it); null in an empty group.
 */
export function dropNeighbour(
  groups: readonly BoardGroup[],
  move: CardMove,
): RowPlace | null {
  const group = groups.find((g) => g.key === move.key)
  const rows = (group?.rows ?? []).filter((r) => r.page.id !== move.rowId)
  const below = rows[move.index]
  if (below) return { before: below.page.id }
  const above = rows[Math.min(move.index, rows.length) - 1]
  return above ? { after: above.page.id } : null
}
