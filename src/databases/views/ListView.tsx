import { useMemo, useRef, useState } from 'react'
import { runTask } from '../../app/errors'
import { t } from '../../i18n/t'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { rowCellText } from '../cellDisplay'
import { TITLE_COLUMN_ID } from '../columnTypes'
import { queryRows, resolveRows } from '../databaseQuery'
import { addRow, titleColumnName, updateView } from '../databaseService'
import { GroupSelect } from './GroupSelect'
import {
  flattenGroups,
  groupRowsByColumn,
  viewGroupColumn,
  withGroup,
  type GroupedItem,
} from './rowGroups'
import { useDatabaseData } from './useDatabaseData'
import { useRowWindow } from './useRowWindow'
import { knownQuery, readHidden, readRowQuery, withSort } from './viewConfig'
import type { ViewProps } from './viewTypes'

/** Values shown after the title on one line. */
const SHOWN_VALUES = 4

/**
 * List view: one line per row (title, then a few values), for quick
 * scanning and phones. Uses the view's filters, sort, hidden columns and
 * grouping like the Table; thousands of rows scroll smoothly (windowed).
 */
export function ListView({ db, database, view, onOpenPage }: ViewProps) {
  const now = useMinuteClock()
  const data = useDatabaseData(db, database, now)
  const body = useRef<HTMLUListElement>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const columns = data?.databases.get(database.id)?.columns

  const rows = useMemo(() => {
    if (!data || !columns) return []
    const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
    return queryRows(
      resolveRows(data, now),
      columns,
      knownQuery(readRowQuery(view.config), ids),
    )
  }, [data, columns, now, view.config])
  const items = useMemo<GroupedItem[]>(() => {
    const column = columns ? viewGroupColumn(view.config, columns) : undefined
    return column
      ? flattenGroups(groupRowsByColumn(rows, column), collapsed)
      : rows.map((row) => ({ kind: 'row', row }))
  }, [rows, columns, view.config, collapsed])
  const { range, before, after } = useRowWindow(items.length, body)

  if (!data || !columns) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  const groupColumn = viewGroupColumn(view.config, columns)
  const hidden = readHidden(view.config)
  const shownColumns = columns.filter(
    (c) => !hidden.includes(c.id) && c.id !== groupColumn?.id,
  )
  const sort = readRowQuery(view.config).sorts?.[0]
  const save = (config: typeof view.config) =>
    void updateView(db, view.id, { config })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4">
        <GroupSelect
          columns={columns}
          value={groupColumn?.id ?? ''}
          onChange={(id) => {
            setCollapsed(new Set())
            save(withGroup(view.config, id || null))
          }}
        />
        <label className="mb-2.5 flex items-center gap-2 text-[12.5px] text-muted">
          {t('list.sortBy')}
          <select
            value={sort?.columnId ?? ''}
            onChange={(e) =>
              save(
                withSort(
                  view.config,
                  e.target.value
                    ? {
                        columnId: e.target.value,
                        direction: sort?.direction ?? 'asc',
                      }
                    : null,
                ),
              )
            }
            className="min-h-8 rounded-md border border-line bg-bg px-2 text-ink"
          >
            <option value="">{t('list.sortManual')}</option>
            <option value={TITLE_COLUMN_ID}>{titleColumnName(database)}</option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {sort && (
          <button
            type="button"
            onClick={() =>
              save(
                withSort(view.config, {
                  columnId: sort.columnId,
                  direction: sort.direction === 'asc' ? 'desc' : 'asc',
                }),
              )
            }
            className="mb-2.5 min-h-8 rounded-md border border-line px-2 text-[12.5px] text-muted hover:text-ink"
          >
            {sort.direction === 'asc'
              ? t('list.ascending')
              : t('list.descending')}
          </button>
        )}
      </div>
      <ul
        ref={body}
        className="overflow-hidden rounded-[10px] border border-line"
        aria-label={database.title}
      >
        {before > 0 && <li aria-hidden style={{ height: before }} />}
        {items.slice(range.start, range.end).map((item) => {
          if (item.kind === 'group') {
            const open = !collapsed.has(item.key)
            const name = item.key || t('group.noValue')
            return (
              <li
                key={`group:${item.key}`}
                className="border-b border-line bg-hover/40 px-3 text-[12.5px] font-medium"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={t(open ? 'group.collapse' : 'group.expand', {
                    name,
                  })}
                  onClick={() => {
                    const next = new Set(collapsed)
                    if (open) next.add(item.key)
                    else next.delete(item.key)
                    setCollapsed(next)
                  }}
                  className="flex min-h-8 items-center gap-1.5"
                >
                  <span aria-hidden>{open ? '▾' : '▸'}</span>
                  {name}
                  <span className="font-normal text-muted">{item.count}</span>
                </button>
              </li>
            )
          }
          const { row } = item
          const values = shownColumns
            .map((c) => rowCellText(row, c))
            .filter((v) => v !== '')
            .slice(0, SHOWN_VALUES)
          const title = row.page.title || t('review.untitled')
          return (
            <li
              key={row.page.id}
              className="border-b border-line last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onOpenPage(row.page.id)}
                className="flex min-h-11 w-full flex-wrap items-baseline gap-x-3 px-3 py-2 text-start hover:bg-hover"
              >
                <span className={row.page.title ? 'font-medium' : 'text-muted'}>
                  {title}
                </span>
                <span className="min-w-0 text-[12.5px] text-muted [overflow-wrap:anywhere]">
                  {values.join(' · ')}
                </span>
              </button>
            </li>
          )
        })}
        {after > 0 && <li aria-hidden style={{ height: after }} />}
      </ul>
      {rows.length === 0 && (
        <p className="px-1 py-3 text-sm text-muted">{t('database.empty')}</p>
      )}
      <button
        type="button"
        onClick={() =>
          runTask(addRow(db, database.id).then((page) => onOpenPage(page.id)))
        }
        className="mt-2 min-h-10 w-full rounded-lg border border-line px-3 text-start text-[13px] text-muted hover:bg-hover hover:text-ink"
      >
        {t('table.newRow')}
      </button>
    </div>
  )
}
