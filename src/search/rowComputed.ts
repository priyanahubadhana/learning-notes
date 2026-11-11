import type { DbColumn, Page } from '../core/types'
import { getColumnType, type ColumnLookups } from '../databases/columnTypes'
import { evaluate } from '../databases/formula/formulaEval'
import { isParseError, parseFormula } from '../databases/formula/formulaParser'
import {
  isDate,
  isError,
  numberText,
  type FValue,
} from '../databases/formula/formulaValue'

/**
 * What a database row adds to search beyond its stored text: the name of
 * every ticked Checkbox column (so "done" finds the rows marked done) and
 * the value of every Formula column. A formula is worked out from the row's
 * own cells; Relation and Rollup cells are not available while saving, so a
 * formula that needs them reads them as blank. TODAY() and NOW() are the
 * time of the save.
 */

const noLookups: ColumnLookups = {
  tagName: () => undefined,
  pageTitle: () => undefined,
}

/** A formula value as search text (errors and blanks add nothing). */
function valueText(value: FValue): string {
  if (value === null || isError(value)) return ''
  if (Array.isArray(value)) return value.map(valueText).join(' ')
  if (isDate(value)) return value.date
  if (typeof value === 'number')
    return Number.isFinite(value) ? numberText(value) : ''
  if (typeof value === 'boolean') return value ? 'true' : ''
  return value
}

/** Ticked checkbox names and formula results of one row, as plain text. */
export function computedText(
  page: Pick<Page, 'title' | 'values'>,
  columns: readonly DbColumn[],
  now: number = Date.now(),
): string {
  const values = page.values ?? {}
  const parts: string[] = []
  const memo = new Map<string, FValue>()
  const busy = new Set<string>()
  const cell = (column: DbColumn): FValue => {
    if (column.type !== 'formula') {
      const definition = getColumnType(column.type)
      if (!definition || definition.computed) return null
      return definition.toValue(
        definition.read(values[column.id] ?? null, column),
        column,
        noLookups,
      )
    }
    const known = memo.get(column.id)
    if (known !== undefined) return known
    if (busy.has(column.id)) return null // a formula that reads itself
    busy.add(column.id)
    const tree = parseFormula(String(column.config.formula ?? ''))
    const result = isParseError(tree)
      ? null
      : evaluate(tree, {
          now,
          ref: (name) => {
            const lower = name.toLocaleLowerCase()
            const found =
              columns.find((c) => c.name === name) ??
              columns.find((c) => c.name.toLocaleLowerCase() === lower)
            // A name that is no column is the title column (it may be renamed).
            return found ? cell(found) : page.title
          },
        })
    busy.delete(column.id)
    memo.set(column.id, result)
    return result
  }
  for (const column of columns) {
    if (column.type === 'checkbox') {
      if (cell(column) === true) parts.push(column.name)
    } else if (column.type === 'formula') {
      parts.push(valueText(cell(column)))
    }
  }
  return parts.join(' ')
}
