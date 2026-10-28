import { useMemo, useState } from 'react'
import { runTask } from '../../app/errors'
import { Tip } from '../../help/Help'
import { dateLocale, t } from '../../i18n/t'
import { dateColumns } from '../dashboard/chartSpec'
import { localDay } from '../formula/formulaValue'
import { queryRows, resolveRows } from '../databaseQuery'
import { addColumn, addRow, updateView } from '../databaseService'
import { TITLE_COLUMN_ID } from '../columnTypes'
import { periodStart } from '../dashboard/chartData'
import {
  calendarDays,
  rowsByDay,
  shift,
  type CalendarMode,
} from './calendarData'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { knownQuery, readRowQuery } from './viewConfig'
import { useDatabaseData } from './useDatabaseData'
import type { ViewProps } from './viewTypes'

const MAX_CHIPS = 3

/** A day as "27 Oct" (or "Oct 27") in the user's date style. */
const dayText = (day: string, long = false) =>
  new Intl.DateTimeFormat(dateLocale(), {
    day: 'numeric',
    month: long ? 'long' : 'short',
    ...(long && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(Date.parse(`${day}T00:00:00Z`))

const weekdayText = (day: string) =>
  new Intl.DateTimeFormat(dateLocale(), {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(Date.parse(`${day}T00:00:00Z`))

/**
 * Calendar view: rows on the day of a Date column, as a month or a week.
 * The date column and the mode are saved in the view (`dateColumnId`,
 * `mode`); with a real Date column, "+" on a day adds a row for that day.
 */
export function CalendarView({ db, database, view, onOpenPage }: ViewProps) {
  const now = useMinuteClock()
  const data = useDatabaseData(db, database, now)
  const today = localDay(now)
  const [anchor, setAnchor] = useState(today)
  const columns = data?.databases.get(database.id)?.columns

  const options = useMemo(
    () => (columns ? dateColumns(columns) : []),
    [columns],
  )
  const dateColumn =
    options.find((c) => c.id === view.config.dateColumnId) ?? options[0]
  const mode: CalendarMode = view.config.mode === 'week' ? 'week' : 'month'

  const { byDay, undated } = useMemo(() => {
    if (!data || !columns || !dateColumn) {
      return { byDay: new Map(), undated: 0 }
    }
    const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
    const rows = queryRows(
      resolveRows(data, now),
      columns,
      knownQuery(readRowQuery(view.config), ids),
    )
    return rowsByDay(rows, dateColumn.id)
  }, [data, columns, dateColumn, now, view.config])

  if (!data || !columns) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  if (!dateColumn) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <p>{t('calendar.noDate')}</p>
        <button
          type="button"
          onClick={() =>
            runTask(
              addColumn(db, database.id, {
                name: t('calendar.dateName'),
                type: 'date',
              }),
            )
          }
          className="min-h-9 rounded-lg border border-line px-3 text-[13px] text-ink hover:bg-hover"
        >
          {t('calendar.addDate')}
        </button>
      </div>
    )
  }

  const save = (changes: Record<string, string>) =>
    updateView(db, view.id, { config: { ...view.config, ...changes } })
  const days = calendarDays(byDay, anchor, mode)
  const title =
    mode === 'month'
      ? new Intl.DateTimeFormat(dateLocale(), {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(Date.parse(`${anchor.slice(0, 7)}-01T00:00:00Z`))
      : t('calendar.weekOf', {
          day: dayText(periodStart(anchor, 'week'), true),
        })
  // Only a typed Date column can be written to ("Last revised" is worked out).
  const canAdd = dateColumn.type === 'date' && database.kind !== 'studyTracker'
  const button =
    'min-h-8 rounded-md border border-line px-2.5 text-[13px] hover:bg-hover'

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <h3 className="me-2 min-w-0 text-[15px] font-semibold">{title}</h3>
        <Tip id="db.calendarNav" touchInfo={false}>
          <span className="inline-flex gap-1">
            <button
              type="button"
              aria-label={t('calendar.previous')}
              onClick={() => setAnchor(shift(anchor, mode, -1))}
              className={button}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setAnchor(today)}
              className={button}
            >
              {t('calendar.today')}
            </button>
            <button
              type="button"
              aria-label={t('calendar.next')}
              onClick={() => setAnchor(shift(anchor, mode, 1))}
              className={button}
            >
              ›
            </button>
          </span>
        </Tip>
        <div
          role="group"
          aria-label={t('calendar.mode')}
          className="inline-flex gap-0.5 rounded-[8px] bg-hover p-[2px]"
        >
          {(['month', 'week'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => void save({ mode: m })}
              className="min-h-7 rounded-[6px] px-2.5 text-[12.5px] text-muted aria-pressed:bg-bg aria-pressed:text-ink"
            >
              {t(`calendar.${m}`)}
            </button>
          ))}
        </div>
        {options.length > 1 && (
          <select
            aria-label={t('calendar.dateColumn')}
            value={dateColumn.id}
            onChange={(e) => void save({ dateColumnId: e.target.value })}
            className="min-h-8 rounded-md border border-line bg-bg px-2 text-[13px]"
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-px rounded-xl border border-line bg-line">
          {days.slice(0, 7).map((d) => (
            <div
              key={`h${d.day}`}
              className="bg-bg px-2 py-1 text-[11.5px] font-medium text-muted"
            >
              {weekdayText(d.day)}
            </div>
          ))}
          {days.map((d) => (
            <div
              key={d.day}
              data-calendar-day={d.day}
              className={`group relative min-h-24 bg-bg p-1.5 ${
                d.inPeriod ? '' : 'opacity-50'
              } ${mode === 'week' ? 'min-h-40' : ''}`}
            >
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span
                  className={
                    d.day === today
                      ? 'rounded-full bg-accent px-1.5 font-medium text-white'
                      : 'text-muted'
                  }
                >
                  {Number(d.day.slice(8, 10))}
                </span>
                {canAdd && (
                  <button
                    type="button"
                    aria-label={t('calendar.addOn', { day: dayText(d.day) })}
                    onClick={() =>
                      runTask(
                        addRow(db, database.id, {
                          values: { [dateColumn.id]: d.day },
                        }).then((page) => onOpenPage(page.id)),
                      )
                    }
                    className="rounded px-1 text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-hover"
                  >
                    +
                  </button>
                )}
              </div>
              <ul className="grid gap-0.5">
                {d.rows
                  .slice(0, mode === 'week' ? 12 : MAX_CHIPS)
                  .map((row) => (
                    <li key={row.page.id}>
                      <button
                        type="button"
                        onClick={() => onOpenPage(row.page.id)}
                        className="w-full truncate rounded bg-soft px-1.5 py-0.5 text-start text-[12px] hover:bg-hover"
                      >
                        {row.page.title || t('review.untitled')}
                      </button>
                    </li>
                  ))}
                {d.rows.length > (mode === 'week' ? 12 : MAX_CHIPS) && (
                  <li className="px-1.5 text-[11.5px] text-muted">
                    {t('calendar.more', {
                      count: d.rows.length - (mode === 'week' ? 12 : MAX_CHIPS),
                    })}
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {undated > 0 && (
        <p className="mt-2 text-xs text-muted">
          {t('calendar.undated', { count: undated })}
        </p>
      )}
    </div>
  )
}
