import type { JsonObject, JsonValue } from '../../core/types'
import type { FilterOp, RowFilter, RowQuery, RowSort } from '../databaseQuery'

/**
 * A view's saved settings (`DbView.config`) read safely: anything not in
 * the expected shape is skipped, so an old or damaged view still opens.
 */

const FILTER_OPS = new Set<FilterOp>([
  'contains',
  'notContains',
  'is',
  'isNot',
  'startsWith',
  'isEmpty',
  'isNotEmpty',
  'gt',
  'lt',
  'gte',
  'lte',
  'before',
  'after',
  'onOrBefore',
  'onOrAfter',
  'isChecked',
  'isNotChecked',
  'isAnyOf',
  'isNoneOf',
])

const isObject = (v: JsonValue | undefined): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const objects = (v: JsonValue | undefined): JsonObject[] =>
  Array.isArray(v) ? v.filter(isObject) : []

/** The view's sorts and filters, as a query for `queryRows`. */
export function readRowQuery(config: JsonObject): RowQuery {
  const sorts: RowSort[] = objects(config.sorts).flatMap((s) =>
    typeof s.columnId === 'string'
      ? [
          {
            columnId: s.columnId,
            direction: s.direction === 'desc' ? 'desc' : 'asc',
          },
        ]
      : [],
  )
  const filters: RowFilter[] = objects(config.filters).flatMap((f) =>
    typeof f.columnId === 'string' && FILTER_OPS.has(f.op as FilterOp)
      ? [
          {
            columnId: f.columnId,
            op: f.op as FilterOp,
            ...(f.value !== undefined && { value: f.value }),
          },
        ]
      : [],
  )
  return { sorts, filters, match: config.match === 'any' ? 'any' : 'all' }
}

/** Column ids the view hides. */
export function readHidden(config: JsonObject): string[] {
  return Array.isArray(config.hidden)
    ? config.hidden.filter((v): v is string => typeof v === 'string')
    : []
}
