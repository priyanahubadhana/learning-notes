import type { DbColumn, JsonValue } from '../../core/types'
import { getColumnType, isComputedColumn } from '../columnTypes'
import type { ResolvedRow } from '../databaseQuery'
import { localDay } from '../formula/formulaValue'
import { numberForInput, typedNumber } from './columnFilters'

/**
 * Table cells: how each column's cells are edited, and the typed text of
 * an inline editor turned into a stored value and back.
 */

/** How a cell is edited. */
export type EditKind = 'none' | 'inline' | 'checkbox' | 'stars' | 'picker'

const PICKER_TYPES = new Set([
  'choice',
  'choices',
  'tag',
  'noteLink',
  'relation',
])

export function editKind(column: DbColumn | null): EditKind {
  if (!column) return 'inline' // the title
  if (column.type === 'relation') return 'picker' // both sides can be set
  if (!getColumnType(column.type) || isComputedColumn(column)) return 'none'
  if (column.type === 'checkbox') return 'checkbox'
  if (column.type === 'number' && column.config.format === 'stars') {
    return 'stars'
  }
  return PICKER_TYPES.has(column.type) ? 'picker' : 'inline'
}

/** A stored cell value as this column reads it. */
export function rawCell(row: ResolvedRow, column: DbColumn): JsonValue | null {
  const definition = getColumnType(column.type)
  return definition
    ? definition.read(row.page.values?.[column.id], column)
    : null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** A stored date as a date input shows it (times in local time). */
function dateForInput(raw: JsonValue | null, withTime: boolean): string {
  if (typeof raw !== 'string') return ''
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw)
  if (!withTime) return day ? raw : localDay(Date.parse(raw))
  const d = new Date(day ? `${raw}T00:00` : raw)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** What an inline editor starts with. */
export function inlineStart(row: ResolvedRow, column: DbColumn | null): string {
  if (!column) return row.page.title
  const raw = rawCell(row, column)
  if (column.type === 'number') {
    return typeof raw === 'number' ? numberForInput(raw, column) : ''
  }
  if (column.type === 'date') {
    return dateForInput(raw, column.config.includeTime === true)
  }
  return typeof raw === 'string' ? raw : ''
}

/**
 * Typed text as the value to store, or undefined if it does not fit
 * (a number column given words).
 */
export function inlineValue(
  text: string,
  column: DbColumn | null,
): JsonValue | undefined {
  if (!column) return text.trim()
  if (column.type === 'number') {
    if (text.trim() === '') return null
    return typedNumber(text, column) ?? undefined
  }
  if (column.type === 'date' && column.config.includeTime === true && text) {
    const ms = new Date(text).getTime() // local time, as typed
    return Number.isNaN(ms) ? undefined : new Date(ms).toISOString()
  }
  return text
}

/** Ids stored in a list cell (or the one id of a Choice). */
export function currentIds(row: ResolvedRow, column: DbColumn): string[] {
  if (column.type === 'relation') return row.links[column.id] ?? []
  const raw = rawCell(row, column)
  if (typeof raw === 'string') return [raw]
  return Array.isArray(raw)
    ? raw.filter((v): v is string => typeof v === 'string')
    : []
}
