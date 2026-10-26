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

/*
 * Changing a view's settings. Each returns a new config (the old one is
 * left alone), ready for `updateView`. A table sorts by one column at a
 * time and keeps one filter per column, like the column menus offer.
 */

/** Sorts by one column (null = no sort). */
export function withSort(config: JsonObject, sort: RowSort | null): JsonObject {
  const next = { ...config }
  if (sort)
    next.sorts = [{ columnId: sort.columnId, direction: sort.direction }]
  else delete next.sorts
  return next
}

/** Sets (or with null removes) the filter on `columnId`. */
export function withFilter(
  config: JsonObject,
  columnId: string,
  filter: RowFilter | null,
): JsonObject {
  const kept = readRowQuery(config).filters!.filter(
    (f) => f.columnId !== columnId,
  )
  const filters: JsonObject[] = [...kept, ...(filter ? [filter] : [])].map(
    (f) => ({
      columnId: f.columnId,
      op: f.op,
      ...(f.value !== undefined && { value: f.value }),
    }),
  )
  const next = { ...config }
  if (filters.length > 0) next.filters = filters
  else delete next.filters
  return next
}

/** Removes every sort and filter. */
export function withoutQuery(config: JsonObject): JsonObject {
  const next = { ...config }
  delete next.sorts
  delete next.filters
  delete next.match
  return next
}

/** Hides or shows a column. */
export function withHidden(
  config: JsonObject,
  columnId: string,
  hidden: boolean,
): JsonObject {
  const ids = readHidden(config).filter((id) => id !== columnId)
  if (hidden) ids.push(columnId)
  const next = { ...config }
  if (ids.length > 0) next.hidden = ids
  else delete next.hidden
  return next
}

/** The query without sorts and filters on columns that no longer exist. */
export function knownQuery(query: RowQuery, columnIds: Set<string>): RowQuery {
  return {
    ...query,
    sorts: query.sorts?.filter((s) => columnIds.has(s.columnId)),
    filters: query.filters?.filter((f) => columnIds.has(f.columnId)),
  }
}
