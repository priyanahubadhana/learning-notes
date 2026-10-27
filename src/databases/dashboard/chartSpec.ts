import { createId } from '../../core/ids'
import type {
  Database,
  DbColumn,
  JsonObject,
  JsonValue,
} from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
import { TITLE_COLUMN_ID } from '../columnTypes'
import type { FilterOp, RowFilter } from '../databaseQuery'
import { titleColumnName } from '../databaseService'

/**
 * Dashboard charts as saved in a Dashboard view (`DbView.config.charts`):
 * what each chart shows, read safely (a damaged chart is skipped, so the
 * dashboard still opens). While a dashboard has no saved charts it shows
 * starter charts picked from the database's columns (`suggestCharts`);
 * the first change saves them.
 */

export const CHART_KINDS = [
  'number',
  'bar',
  'line',
  'donut',
  'progress',
  'heatmap',
] as const
export type ChartKind = (typeof CHART_KINDS)[number]

export const MEASURES = ['count', 'sum', 'average', 'min', 'max'] as const
export type Measure = (typeof MEASURES)[number]

export const CHART_SIZES = ['small', 'medium', 'wide'] as const
export type ChartSize = (typeof CHART_SIZES)[number]

export const PERIODS = ['day', 'week', 'month'] as const
export type Period = (typeof PERIODS)[number]

/** Filter conditions a chart offers ("Only rows where …"). */
export const CHART_FILTER_OPS: FilterOp[] = [
  'isNotEmpty',
  'isEmpty',
  'is',
  'isChecked',
  'isNotChecked',
]

export interface ChartSpec {
  id: string
  kind: ChartKind
  /** Own title; '' = worked out from the settings ("Count of rows by Status"). */
  title: string
  size: ChartSize
  /** What each number is: a count of rows, or sum/average/… of a column. */
  measure: Measure
  /** Column added up / averaged (not used by 'count'). */
  valueColumnId?: string
  /** Bar, donut, progress: one bar/slice per value (TITLE_COLUMN_ID = per row). */
  groupColumnId?: string
  /** Line, heatmap: the date column that places rows in time. */
  dateColumnId?: string
  /** Line: one point per day, week or month. */
  period?: Period
  /** Only rows that pass this condition count. */
  filter?: RowFilter
}

/** Charts that compare groups; donut and progress show parts of a whole. */
export const usesGroups = (kind: ChartKind) =>
  kind === 'bar' || kind === 'donut' || kind === 'progress'
export const usesDates = (kind: ChartKind) =>
  kind === 'line' || kind === 'heatmap'
/** Parts of a whole only add up for counts and sums. */
export const wholeOnly = (kind: ChartKind) =>
  kind === 'donut' || kind === 'progress'

// ------------------------------------------------------------ column roles

const NUMERIC = new Set([
  'number',
  'formula',
  'rollup',
  'trackerCardsDue',
  'trackerCorrect',
])
const DATES = new Set(['date', 'trackerLastRevised', 'formula', 'rollup'])
const NOT_GROUPS = new Set(['date', 'trackerLastRevised', 'url'])

/** Columns that can be added up or averaged. */
export const valueColumns = (columns: readonly DbColumn[]) =>
  columns.filter((c) => NUMERIC.has(c.type))
/** Columns that place rows in time. */
export const dateColumns = (columns: readonly DbColumn[]) =>
  columns.filter((c) => DATES.has(c.type))
/** Columns rows can be grouped by (the title is offered separately). */
export const groupColumns = (columns: readonly DbColumn[]) =>
  columns.filter((c) => !NOT_GROUPS.has(c.type))

// ------------------------------------------------------------------ reading

const isObject = (v: JsonValue | undefined): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const oneOf = <T extends string>(
  list: readonly T[],
  v: JsonValue | undefined,
  fallback: T,
): T => (list.includes(v as T) ? (v as T) : fallback)

const str = (v: JsonValue | undefined) =>
  typeof v === 'string' && v !== '' ? v : undefined

function readFilter(v: JsonValue | undefined): RowFilter | undefined {
  if (!isObject(v) || typeof v.columnId !== 'string') return undefined
  if (!CHART_FILTER_OPS.includes(v.op as FilterOp)) return undefined
  return {
    columnId: v.columnId,
    op: v.op as FilterOp,
    ...(v.value !== undefined && { value: v.value }),
  }
}

function readChart(v: JsonObject): ChartSpec | null {
  if (typeof v.id !== 'string' || !CHART_KINDS.includes(v.kind as ChartKind))
    return null
  const spec: ChartSpec = {
    id: v.id,
    kind: v.kind as ChartKind,
    title: typeof v.title === 'string' ? v.title.slice(0, 200) : '',
    size: oneOf(CHART_SIZES, v.size, 'small'),
    measure: oneOf(MEASURES, v.measure, 'count'),
  }
  const valueColumnId = str(v.valueColumnId)
  const groupColumnId = str(v.groupColumnId)
  const dateColumnId = str(v.dateColumnId)
  const filter = readFilter(v.filter)
  if (valueColumnId) spec.valueColumnId = valueColumnId
  if (groupColumnId) spec.groupColumnId = groupColumnId
  if (dateColumnId) spec.dateColumnId = dateColumnId
  if (v.period !== undefined) spec.period = oneOf(PERIODS, v.period, 'week')
  if (filter) spec.filter = filter
  return spec
}

/** The saved charts, or null while the dashboard shows starter charts. */
export function readCharts(config: JsonObject): ChartSpec[] | null {
  if (!Array.isArray(config.charts)) return null
  return config.charts.flatMap((c) => {
    const spec = isObject(c) ? readChart(c) : null
    return spec ? [spec] : []
  })
}

/** A config with these charts saved. */
export function withCharts(
  config: JsonObject,
  charts: readonly ChartSpec[],
): JsonObject {
  return {
    ...config,
    charts: charts.map((c) => JSON.parse(JSON.stringify(c)) as JsonObject),
  }
}

/** Chart settings that still point at live columns (others are dropped). */
export function knownChart(
  spec: ChartSpec,
  columns: readonly DbColumn[],
): ChartSpec {
  const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
  const next = { ...spec }
  if (next.valueColumnId && !ids.has(next.valueColumnId)) {
    delete next.valueColumnId
  }
  if (next.measure !== 'count' && !next.valueColumnId) next.measure = 'count'
  if (next.groupColumnId && !ids.has(next.groupColumnId))
    delete next.groupColumnId
  if (next.dateColumnId && !ids.has(next.dateColumnId)) delete next.dateColumnId
  if (next.filter && !ids.has(next.filter.columnId)) delete next.filter
  return next
}

// ----------------------------------------------------------------- creating

/** A new chart of a kind, filled with sensible columns. */
export function newChart(
  kind: ChartKind,
  columns: readonly DbColumn[],
): ChartSpec {
  const spec: ChartSpec = {
    id: createId(),
    kind,
    title: '',
    size: kind === 'number' ? 'small' : kind === 'heatmap' ? 'wide' : 'medium',
    measure: 'count',
  }
  if (usesGroups(kind)) {
    spec.groupColumnId =
      groupColumns(columns).find((c) => isChoiceLike(c))?.id ?? TITLE_COLUMN_ID
  }
  if (usesDates(kind)) {
    const date = dateColumns(columns).find((c) => c.type !== 'formula')
    if (date) spec.dateColumnId = date.id
    if (kind === 'line') spec.period = 'week'
  }
  if (kind === 'bar' && spec.groupColumnId === TITLE_COLUMN_ID) {
    const value = valueColumns(columns)[0]
    if (value) {
      spec.measure = 'sum'
      spec.valueColumnId = value.id
    }
  }
  return spec
}

const isChoiceLike = (c: DbColumn) =>
  c.type === 'choice' ||
  c.type === 'choices' ||
  c.type === 'checkbox' ||
  c.type === 'trackerStatus'

/**
 * Starter charts for a dashboard nobody has changed yet, picked from the
 * database's columns: a row count, a tile per number column, groups by
 * the first choice-like column, numbers per row and activity over time.
 * Ids are fixed so a starter chart keeps its id once saved.
 */
export function suggestCharts(columns: readonly DbColumn[]): ChartSpec[] {
  const charts: ChartSpec[] = [
    {
      id: 'starter-count',
      kind: 'number',
      title: '',
      size: 'small',
      measure: 'count',
    },
  ]
  const values = valueColumns(columns).filter((c) => c.type !== 'formula')
  for (const c of values.slice(0, 3)) {
    const average =
      c.type === 'trackerCorrect' ||
      c.config.format === 'stars' ||
      c.config.format === 'percent'
    charts.push({
      id: `starter-tile-${c.id}`,
      kind: 'number',
      title: '',
      size: 'small',
      measure: average ? 'average' : 'sum',
      valueColumnId: c.id,
    })
  }
  const group = groupColumns(columns).find(isChoiceLike)
  if (group) {
    charts.push({
      id: 'starter-donut',
      kind: 'donut',
      title: '',
      size: 'medium',
      measure: 'count',
      groupColumnId: group.id,
    })
  }
  const perRow = values.find((c) => c.config.format !== 'stars')
  if (perRow) {
    charts.push({
      id: 'starter-bar',
      kind: 'bar',
      title: '',
      size: 'medium',
      measure: 'sum',
      valueColumnId: perRow.id,
      groupColumnId: TITLE_COLUMN_ID,
    })
  }
  if (group) {
    charts.push({
      id: 'starter-progress',
      kind: 'progress',
      title: '',
      size: perRow ? 'wide' : 'medium',
      measure: 'count',
      groupColumnId: group.id,
    })
  }
  const date = dateColumns(columns).find((c) => c.type !== 'formula')
  if (date) {
    charts.push({
      id: 'starter-heatmap',
      kind: 'heatmap',
      title: '',
      size: 'wide',
      measure: 'count',
      dateColumnId: date.id,
    })
  }
  return charts
}

// ------------------------------------------------------------------- titles

/** A column's name ('' if gone); the title column has the database's name for it. */
export function columnName(
  id: string | undefined,
  columns: readonly DbColumn[],
  database: Database,
): string {
  if (id === TITLE_COLUMN_ID) return titleColumnName(database)
  return columns.find((c) => c.id === id)?.name ?? ''
}

/** What a chart's numbers are: "Rows", "Sum of Price", "Average of Confidence". */
export function measureLabel(
  spec: Pick<ChartSpec, 'measure' | 'valueColumnId'>,
  columns: readonly DbColumn[],
  database: Database,
): string {
  if (spec.measure === 'count') {
    // A Study tracker's rows are lessons.
    return database.kind === 'studyTracker'
      ? t('chart.measure.lessons')
      : t('chart.measure.countShort')
  }
  return t(`chart.measureOf.${spec.measure}` as MessageKey, {
    column: columnName(spec.valueColumnId, columns, database),
  })
}

/** The chart's own title, or one worked out from its settings. */
export function chartTitle(
  spec: ChartSpec,
  columns: readonly DbColumn[],
  database: Database,
): string {
  if (spec.title.trim()) return spec.title.trim()
  // One bar per row: a sum is just that row's value ("Price by Name").
  const perRow =
    spec.groupColumnId === TITLE_COLUMN_ID && spec.measure === 'sum'
  const what = perRow
    ? columnName(spec.valueColumnId, columns, database)
    : measureLabel(spec, columns, database)
  // A progress bar of counts reads as progress ("Status progress").
  if (
    spec.kind === 'progress' &&
    spec.measure === 'count' &&
    spec.groupColumnId
  ) {
    return t('chart.title.progress', {
      group: columnName(spec.groupColumnId, columns, database),
    })
  }
  if (usesGroups(spec.kind) && spec.groupColumnId) {
    return t('chart.title.by', {
      what,
      group: columnName(spec.groupColumnId, columns, database),
    })
  }
  if (spec.kind === 'line' && spec.dateColumnId) {
    return t(`chart.title.per.${spec.period ?? 'week'}` as MessageKey, {
      what,
      date: columnName(spec.dateColumnId, columns, database),
    })
  }
  if (spec.kind === 'heatmap' && spec.dateColumnId) {
    return t('chart.title.byDay', {
      what,
      date: columnName(spec.dateColumnId, columns, database),
    })
  }
  return what
}
