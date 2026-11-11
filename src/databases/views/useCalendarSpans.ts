import { useMemo } from 'react'
import type { DbColumn, JsonObject } from '../../core/types'
import { TITLE_COLUMN_ID } from '../columnTypes'
import { queryRows, resolveRows, type DatabaseData } from '../databaseQuery'
import { rowSpans } from './calendarSpans'
import { knownQuery, readRowQuery } from './viewConfig'

/**
 * The rows the view shows (its filters and sorts applied) as day spans.
 * Worked out again only when the data, the columns or the view change, not
 * while a row is being dragged.
 */
export function useCalendarSpans(
  data: DatabaseData | undefined,
  columns: readonly DbColumn[] | undefined,
  startId: string,
  endId: string | null,
  now: number,
  config: JsonObject,
) {
  return useMemo(() => {
    if (!data || !columns || !startId) return { spans: [], undated: 0 }
    const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
    const rows = queryRows(
      resolveRows(data, now),
      columns,
      knownQuery(readRowQuery(config), ids),
    )
    return rowSpans(rows, startId, endId)
  }, [data, columns, startId, endId, now, config])
}
