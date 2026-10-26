import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { t } from '../../i18n/t'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { cellText } from '../cellDisplay'
import { TITLE_COLUMN_ID } from '../columnTypes'
import { loadDatabaseData, queryRows, resolveRows } from '../databaseQuery'
import { titleColumnName } from '../databaseService'
import { columnIcon, isAutoColumn } from './columnLook'
import { readHidden, readRowQuery } from './viewConfig'
import type { ViewProps } from './viewTypes'

/** Rows drawn at first, and added per "Show more" (keeps big tables fast). */
const PAGE_SIZE = 100

/**
 * Table view: one row per database row, one column per database column,
 * with the view's sorts, filters and hidden columns applied.
 */
export function TableView({ db, database, view, onOpenPage }: ViewProps) {
  const data = useLiveQuery(
    () => loadDatabaseData(db, database.id),
    [db, database.id],
  )
  const now = useMinuteClock()
  const [shown, setShown] = useState(PAGE_SIZE)
  const loaded = data?.databases.get(database.id)
  const hidden = readHidden(view.config)
  const columns = (loaded?.columns ?? []).filter((c) => !hidden.includes(c.id))
  const rows = useMemo(() => {
    const all = data?.databases.get(database.id)?.columns
    return data && all
      ? queryRows(resolveRows(data, now), all, readRowQuery(view.config))
      : []
  }, [data, database.id, now, view.config])
  if (!data) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }

  const head =
    'whitespace-nowrap border-b border-line px-3 py-2 text-start text-xs font-medium text-muted'
  const cell = 'border-b border-line px-3 py-2 align-top'
  return (
    <div>
      <div className="overflow-x-auto rounded-[10px] border border-line">
        <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th
                scope="col"
                className={`${head} sticky start-0 z-[1] min-w-48 bg-bg`}
              >
                <span aria-hidden className="me-1.5">
                  ↗
                </span>
                {titleColumnName(database)}
              </th>
              {columns.map((column) => (
                <th key={column.id} scope="col" className={head}>
                  <span aria-hidden className="me-1.5">
                    {columnIcon(column)}
                  </span>
                  {column.name}
                  {isAutoColumn(column) && (
                    <span className="ms-1.5 rounded bg-hover px-1 py-px text-[10.5px]">
                      {t('database.auto')}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((row) => (
              <tr key={row.page.id}>
                <th
                  scope="row"
                  className={`${cell} sticky start-0 bg-bg text-start font-medium`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenPage(row.page.id)}
                    className="text-start hover:text-accent hover:underline"
                  >
                    {cellText(row.values[TITLE_COLUMN_ID] ?? null) ||
                      t('review.untitled')}
                  </button>
                </th>
                {columns.map((column) => (
                  <td key={column.id} className={cell}>
                    {cellText(row.values[column.id] ?? null, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted">{t('database.empty')}</p>
        )}
      </div>
      {rows.length > shown && (
        <button
          type="button"
          onClick={() => setShown(shown + PAGE_SIZE)}
          className="mt-3 min-h-10 w-full rounded-lg border border-line text-sm text-muted hover:border-accent hover:text-accent"
        >
          {t('search.more')}
        </button>
      )}
    </div>
  )
}
