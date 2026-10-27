import { createId } from '../../core/ids'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Database, DbColumn } from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
import { choiceOptions, TITLE_COLUMN_ID } from '../columnTypes'
import type { FilterOp, ResolvedRow } from '../databaseQuery'
import { ChartBody } from './ChartBody'
import { chartData } from './chartData'
import {
  CHART_KINDS,
  CHART_SIZES,
  chartTitle,
  columnName,
  dateColumns,
  groupColumns,
  measureLabel,
  MEASURES,
  newChart,
  PERIODS,
  usesDates,
  usesGroups,
  valueColumns,
  wholeOnly,
  type ChartKind,
  type ChartSpec,
  type Measure,
} from './chartSpec'

export type ChartTarget = { kind: 'new' } | { kind: 'edit'; spec: ChartSpec }

const KIND_ICONS: Record<ChartKind, string> = {
  number: '#',
  bar: '☰',
  line: '⟋',
  donut: '◔',
  progress: '▭',
  heatmap: '▦',
}

const field =
  'min-h-9 w-full rounded-lg border border-line bg-bg px-2.5 text-sm outline-none focus:border-accent'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}

/** A copy of the chart without one optional setting. */
function without(spec: ChartSpec, key: 'valueColumnId' | 'filter'): ChartSpec {
  const next = { ...spec }
  delete next[key]
  return next
}

/** Conditions a column offers in "Only rows where". */
function filterOps(column: DbColumn | undefined): FilterOp[] {
  if (column?.type === 'checkbox') return ['isChecked', 'isNotChecked']
  if (
    column?.type === 'choice' ||
    column?.type === 'choices' ||
    column?.type === 'trackerStatus'
  ) {
    return ['is', 'isNotEmpty', 'isEmpty']
  }
  return ['isNotEmpty', 'isEmpty']
}

/** Review-history charts a Study tracker can add (they take no settings). */
const HISTORY_PRESETS = [
  { history: 'streak', kind: 'number', size: 'small' },
  { history: 'correct', kind: 'line', size: 'medium' },
  { history: 'days', kind: 'heatmap', size: 'wide' },
] as const

const isPercent = (column: DbColumn) =>
  column.type === 'trackerCorrect' || column.config.format === 'percent'

/** Measures a chart kind offers (parts of a whole: counts and sums). */
const measuresFor = (kind: ChartKind): readonly Measure[] =>
  wholeOnly(kind) || kind === 'heatmap' ? ['count', 'sum'] : MEASURES

/** Settings kept when the chart type changes, filled in where needed. */
function switchKind(
  spec: ChartSpec,
  kind: ChartKind,
  columns: readonly DbColumn[],
): ChartSpec {
  const fresh = newChart(kind, columns)
  const next: ChartSpec = { ...spec, kind }
  if (usesGroups(kind) && !next.groupColumnId)
    next.groupColumnId = fresh.groupColumnId
  if (usesDates(kind) && !next.dateColumnId)
    next.dateColumnId = fresh.dateColumnId
  if (kind === 'line' && !next.period) next.period = 'week'
  if (!measuresFor(kind).includes(next.measure)) {
    next.measure = 'count'
    delete next.valueColumnId
  }
  return next
}

/**
 * Adds or edits a chart: type, what it shows, grouping or dates, an
 * optional "Only rows where" condition, size and title, with a live
 * preview of the real data.
 */
export function ChartDialog({
  database,
  columns,
  rows,
  now,
  target,
  onSave,
  onClose,
}: {
  database: Database
  columns: readonly DbColumn[]
  rows: readonly ResolvedRow[]
  now: number
  target: ChartTarget
  onSave: (spec: ChartSpec) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [spec, setSpec] = useState<ChartSpec>(() =>
    target.kind === 'edit' ? target.spec : newChart('bar', columns),
  )
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const patch = (changes: Partial<ChartSpec>) =>
    setSpec((s) => ({ ...s, ...changes }))
  const heading =
    target.kind === 'new' ? t('chart.newTitle') : t('chart.editTitle')
  const values = valueColumns(columns)
  const dates = dateColumns(columns)
  const filterColumn = columns.find((c) => c.id === spec.filter?.columnId)
  const measureKey =
    spec.measure === 'count' ? 'count' : `${spec.measure}:${spec.valueColumnId}`

  return (
    <dialog
      ref={ref}
      aria-label={heading}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // click on the backdrop
      }}
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/20"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ ...spec, title: spec.title.trim() })
        }}
      >
        <h2 className="mb-3 text-[15px] font-semibold">{heading}</h2>

        {target.kind === 'new' && database.kind === 'studyTracker' && (
          <fieldset className="mb-3">
            <legend className="mb-1 text-xs text-muted">
              {t('chart.historyTitle')}
            </legend>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {HISTORY_PRESETS.map(({ history, kind, size }) => (
                <button
                  key={history}
                  type="button"
                  onClick={() =>
                    onSave({
                      id: createId(),
                      kind,
                      title: '',
                      size,
                      measure: 'count',
                      history,
                      ...(kind === 'line' && { period: 'week' as const }),
                    })
                  }
                  className="min-h-11 rounded-lg border border-line px-2.5 py-1.5 text-start text-[13px] hover:bg-hover"
                >
                  {t(`chart.title.history.${history}`)}
                </button>
              ))}
            </div>
            <small className="mt-1 block text-[11px] text-muted">
              {t('chart.historyHint')}
            </small>
          </fieldset>
        )}

        <fieldset className="mb-3">
          <legend className="mb-1 text-xs text-muted">{t('chart.type')}</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {CHART_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={spec.kind === kind}
                onClick={() => setSpec((s) => switchKind(s, kind, columns))}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-start hover:bg-hover aria-pressed:border-accent aria-pressed:bg-soft"
              >
                <span aria-hidden className="w-4 text-center text-muted">
                  {KIND_ICONS[kind]}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px]">
                    {t(`chart.kind.${kind}` as MessageKey)}
                  </span>
                  <small className="block text-[11px] leading-snug text-muted">
                    {t(`chart.kindHint.${kind}` as MessageKey)}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <Field label={t('chart.show')}>
          <select
            value={measureKey}
            onChange={(e) => {
              const [measure, columnId] = e.target.value.split(':')
              if (measure === 'count') {
                setSpec((s) =>
                  without({ ...s, measure: 'count' }, 'valueColumnId'),
                )
              } else {
                patch({ measure: measure as Measure, valueColumnId: columnId })
              }
            }}
            className={field}
          >
            <option value="count">{t('chart.measure.count')}</option>
            {values.flatMap((c) =>
              measuresFor(spec.kind)
                // A total of percentages means nothing.
                .filter((m) => m !== 'count' && !(m === 'sum' && isPercent(c)))
                .map((m) => (
                  <option key={`${m}:${c.id}`} value={`${m}:${c.id}`}>
                    {measureLabel(
                      { measure: m, valueColumnId: c.id },
                      columns,
                      database,
                    )}
                  </option>
                )),
            )}
          </select>
          {wholeOnly(spec.kind) && values.length > 0 && (
            <span className="mt-1 block text-xs text-muted">
              {t('chart.wholeOnly')}
            </span>
          )}
        </Field>

        {usesGroups(spec.kind) && (
          <Field label={t('chart.groupBy')}>
            <select
              value={spec.groupColumnId ?? ''}
              onChange={(e) => patch({ groupColumnId: e.target.value })}
              className={field}
            >
              <option value={TITLE_COLUMN_ID}>
                {t('chart.perRow', {
                  column: columnName(TITLE_COLUMN_ID, columns, database),
                })}
              </option>
              {groupColumns(columns).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {usesDates(spec.kind) &&
          (dates.length === 0 ? (
            <p className="mb-3 rounded-lg bg-soft px-3 py-2 text-xs text-muted">
              {t('chart.noDateColumn')}
            </p>
          ) : (
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <Field label={t('chart.date')}>
                  <select
                    value={spec.dateColumnId ?? ''}
                    onChange={(e) => patch({ dateColumnId: e.target.value })}
                    className={field}
                  >
                    {!spec.dateColumnId && <option value="" />}
                    {dates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {spec.kind === 'line' && (
                <div className="w-32">
                  <Field label={t('chart.period')}>
                    <select
                      value={spec.period ?? 'week'}
                      onChange={(e) =>
                        patch({ period: e.target.value as ChartSpec['period'] })
                      }
                      className={field}
                    >
                      {PERIODS.map((p) => (
                        <option key={p} value={p}>
                          {t(`chart.period.${p}` as MessageKey)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </div>
          ))}

        <fieldset className="mb-3">
          <legend className="mb-1 text-xs text-muted">
            {t('chart.filter')}
          </legend>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label={t('chart.filter')}
              value={spec.filter?.columnId ?? ''}
              onChange={(e) => {
                const column = columns.find((c) => c.id === e.target.value)
                if (!column) {
                  setSpec((s) => without(s, 'filter'))
                  return
                }
                const op = filterOps(column)[0]
                const first = choiceOptions(column)[0]
                patch({
                  filter: {
                    columnId: column.id,
                    op,
                    ...(op === 'is' && first && { value: first.id }),
                  },
                })
              }}
              className={`${field} min-w-0 flex-1 basis-40`}
            >
              <option value="">{t('chart.filter.all')}</option>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {spec.filter && (
              <select
                aria-label={t('chart.filter')}
                value={spec.filter.op}
                onChange={(e) => {
                  const op = e.target.value as FilterOp
                  const first = filterColumn && choiceOptions(filterColumn)[0]
                  patch({
                    filter: {
                      columnId: spec.filter!.columnId,
                      op,
                      ...(op === 'is' && first && { value: first.id }),
                    },
                  })
                }}
                className={`${field} w-auto flex-none`}
              >
                {filterOps(filterColumn).map((op) => (
                  <option key={op} value={op}>
                    {t(`chart.op.${op}` as MessageKey)}
                  </option>
                ))}
              </select>
            )}
            {spec.filter?.op === 'is' && filterColumn && (
              <select
                aria-label={filterColumn.name}
                value={String(spec.filter.value ?? '')}
                onChange={(e) =>
                  patch({ filter: { ...spec.filter!, value: e.target.value } })
                }
                className={`${field} min-w-0 flex-1 basis-32`}
              >
                {choiceOptions(filterColumn).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <fieldset className="mb-3">
            <legend className="mb-1 text-xs text-muted">
              {t('chart.size')}
            </legend>
            <div className="inline-flex gap-0.5 rounded-[9px] bg-hover p-[3px]">
              {CHART_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={spec.size === size}
                  onClick={() => patch({ size })}
                  className="min-h-8 rounded-[7px] px-2.5 text-[13px] text-muted aria-pressed:bg-bg aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                >
                  {t(`chart.size.${size}` as MessageKey)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="min-w-0 flex-1 basis-48">
            <Field label={t('chart.name')}>
              <input
                value={spec.title}
                maxLength={200}
                placeholder={chartTitle(
                  { ...spec, title: '' },
                  columns,
                  database,
                )}
                aria-describedby="chart-name-hint"
                onChange={(e) => patch({ title: e.target.value })}
                className={field}
              />
              <span id="chart-name-hint" className="sr-only">
                {t('chart.nameHint')}
              </span>
            </Field>
          </div>
        </div>

        <section
          aria-label={t('chart.preview')}
          className="mb-4 rounded-xl border border-line p-3.5"
        >
          <h3 className="mb-2.5 text-[13px] font-semibold">
            {chartTitle(spec, columns, database)}
          </h3>
          <ChartBody
            spec={spec}
            data={chartData(spec, rows, columns, now)}
            columns={columns}
            asTable={false}
            lessons={database.kind === 'studyTracker'}
          />
        </section>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 rounded-lg px-3 text-muted hover:bg-hover hover:text-ink"
          >
            {t('dialog.cancel')}
          </button>
          <button
            type="submit"
            className="min-h-9 rounded-lg bg-accent px-3 font-medium text-white hover:opacity-90"
          >
            {target.kind === 'new' ? t('chart.add') : t('dialog.save')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
