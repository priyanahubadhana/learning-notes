import { Tip } from '../../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { t } from '../../i18n/t'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { resolveRows } from '../databaseQuery'
import { loadReviewHistory } from '../trackerHistory'
import { updateView } from '../databaseService'
import { PopItem, PopSeparator, Popover } from '../views/Popover'
import { useDatabaseData } from '../views/useDatabaseData'
import type { ViewProps } from '../views/viewTypes'
import { ChartBody } from './ChartBody'
import { chartData } from './chartData'
import { ChartDialog, type ChartTarget } from './ChartDialog'
import {
  chartTitle,
  knownChart,
  readCharts,
  suggestCharts,
  withCharts,
  type ChartSpec,
} from './chartSpec'

/** Grid width per chart size (12 columns on wide screens, 1 on phones). */
const SPAN: Record<ChartSpec['size'], string> = {
  small: 'col-span-6 lg:col-span-3',
  medium: 'col-span-12 lg:col-span-6',
  wide: 'col-span-12',
}

/**
 * Dashboard view: charts of the database's rows (number tiles, bars,
 * lines, donuts, progress bars, calendar heatmaps). Until the user
 * changes something it shows starter charts picked from the columns;
 * charts are saved in the view (`config.charts`) and update live.
 */
export function DashboardView({ db, database, view }: ViewProps) {
  const ui = useContext(AppUiContext)
  const now = useMinuteClock()
  const data = useDatabaseData(db, database, now)
  const history = useLiveQuery(
    () =>
      database.kind === 'studyTracker' && database.notebookId
        ? loadReviewHistory(db, database.notebookId, now)
        : undefined,
    [db, database.kind, database.notebookId, now],
  )
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(
    null,
  )
  const [dialog, setDialog] = useState<ChartTarget | null>(null)
  const [tables, setTables] = useState<Set<string>>(() => new Set())

  const columns = data?.databases.get(database.id)?.columns
  const rows = useMemo(() => (data ? resolveRows(data, now) : []), [data, now])
  const charts = useMemo(
    () =>
      columns
        ? (readCharts(view.config) ?? suggestCharts(columns)).map((c) =>
            knownChart(c, columns),
          )
        : [],
    [columns, view.config],
  )
  if (!data || !columns) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }

  /** Saves the charts (the starter charts become saved ones). */
  const save = (next: ChartSpec[]) =>
    updateView(db, view.id, { config: withCharts(view.config, next) })

  const move = (id: string, by: -1 | 1) => {
    const i = charts.findIndex((c) => c.id === id)
    const j = i + by
    if (i < 0 || j < 0 || j >= charts.length) return
    const next = [...charts]
    ;[next[i], next[j]] = [next[j], next[i]]
    void save(next)
  }

  const remove = (spec: ChartSpec) => {
    const before = charts
    void save(charts.filter((c) => c.id !== spec.id))
    ui.toast(
      t('dashboard.deleted', { name: chartTitle(spec, columns, database) }),
      { label: t('review.undo'), onSelect: () => void save(before) },
    )
  }

  const open = menu && charts.find((c) => c.id === menu.id)
  const index = open ? charts.indexOf(open) : -1

  return (
    <div className="grid grid-cols-12 gap-3">
      {charts.map((spec) => {
        const title = chartTitle(spec, columns, database)
        return (
          <section
            key={spec.id}
            aria-label={title}
            className={`${SPAN[spec.size]} relative min-w-0 rounded-xl border border-line p-3.5`}
          >
            <h3 className="mb-2.5 flex items-start justify-between gap-2 text-[13px] font-semibold">
              <span className="min-w-0">
                {spec.history ? (
                  <Tip id={`tracker.chart.${spec.history}`}>{title}</Tip>
                ) : (
                  title
                )}
              </span>
              <button
                type="button"
                aria-label={t('dashboard.chartMenu', { name: title })}
                aria-haspopup="dialog"
                aria-expanded={menu?.id === spec.id}
                onClick={(e) =>
                  setMenu(
                    menu?.id === spec.id
                      ? null
                      : { id: spec.id, anchor: e.currentTarget },
                  )
                }
                className="-me-1.5 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink"
              >
                ⋯
              </button>
            </h3>
            <ChartBody
              spec={spec}
              data={chartData(spec, rows, columns, now, history)}
              columns={columns}
              asTable={tables.has(spec.id)}
              lessons={database.kind === 'studyTracker'}
            />
          </section>
        )
      })}
      <button
        type="button"
        onClick={() => setDialog({ kind: 'new' })}
        className="col-span-12 min-h-11 rounded-xl border border-dashed border-line text-[13px] text-muted hover:bg-hover hover:text-ink"
      >
        {t('dashboard.addChart')}
      </button>

      {menu && open && (
        <Popover
          anchor={menu.anchor}
          label={t('dashboard.chartMenu', {
            name: chartTitle(open, columns, database),
          })}
          onClose={() => setMenu(null)}
          width={220}
        >
          {!open.history && (
            <PopItem
              icon="✎"
              label={t('dashboard.edit')}
              onClick={() => {
                setMenu(null)
                setDialog({ kind: 'edit', spec: open })
              }}
            />
          )}
          <PopItem
            icon="▤"
            label={
              tables.has(open.id)
                ? t('dashboard.showChart')
                : t('dashboard.showTable')
            }
            onClick={() => {
              const next = new Set(tables)
              if (next.has(open.id)) next.delete(open.id)
              else next.add(open.id)
              setTables(next)
              setMenu(null)
            }}
          />
          {index > 0 && (
            <PopItem
              icon="←"
              label={t('dashboard.moveEarlier')}
              onClick={() => move(open.id, -1)}
            />
          )}
          {index < charts.length - 1 && (
            <PopItem
              icon="→"
              label={t('dashboard.moveLater')}
              onClick={() => move(open.id, 1)}
            />
          )}
          <PopSeparator />
          <PopItem
            icon="🗑"
            label={t('dashboard.delete')}
            onClick={() => {
              setMenu(null)
              remove(open)
            }}
          />
        </Popover>
      )}

      {dialog && (
        <ChartDialog
          database={database}
          columns={columns}
          rows={rows}
          now={now}
          target={dialog}
          onClose={() => setDialog(null)}
          onSave={(spec) => {
            setDialog(null)
            void save(
              dialog.kind === 'new'
                ? [...charts, spec]
                : charts.map((c) => (c.id === spec.id ? spec : c)),
            )
          }}
        />
      )}
    </div>
  )
}
