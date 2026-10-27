import type { DbColumn } from '../../core/types'
import { cellText } from '../cellDisplay'
import { choiceOptions, TITLE_COLUMN_ID } from '../columnTypes'
import { queryRows, type ResolvedRow } from '../databaseQuery'
import {
  dayOf,
  flatten,
  isBlank,
  isDate,
  isError,
  localDay,
  type FValue,
} from '../formula/formulaValue'
import type { ReviewHistory } from '../trackerHistory'
import type { ChartSpec, Measure, Period } from './chartSpec'
import { historyData } from './historyData'

/**
 * Works out what a chart shows from a database's resolved rows: one
 * number, groups (bar, donut, progress), points in time (line) or days
 * (heatmap). Pure and linear in the rows, so 10,000 rows stay quick.
 */

/** One bar / slice. `color` is a Choice option's colour (identity). */
export interface ChartGroup {
  key: string
  label: string
  value: number | null
  rows: number
  color?: string
  /** The "no value" group, or the "Other" group of the smaller ones. */
  special?: 'empty' | 'other'
}

export interface ChartPoint {
  key: string
  /** First day of the period ("YYYY-MM-DD"). */
  day: string
  value: number | null
  rows: number
}

export interface HeatDay {
  day: string
  value: number
  /** Later than today (drawn faintly, not as "none"). */
  future: boolean
}

export type ChartData =
  | { kind: 'number'; value: number | null; rows: number; note?: string }
  | {
      kind: 'groups'
      groups: ChartGroup[]
      /** Rows-per-row bars left out ("12 more"). */
      more: number
      rows: number
    }
  | { kind: 'series'; points: ChartPoint[]; period: Period; rows: number }
  | {
      kind: 'heatmap'
      days: HeatDay[]
      max: number
      total: number
      rows: number
    }

/** Most groups shown before the rest fold into "Other". */
export const MAX_GROUPS = { bar: 12, donut: 6, progress: 6 } as const
/** Points on a line chart, per period. */
export const MAX_POINTS: Record<Period, number> = {
  day: 31,
  week: 12,
  month: 12,
}
/** Weeks shown by a heatmap. */
export const HEAT_WEEKS = 18

const EMPTY_KEY = '\u0000empty'
const OTHER_KEY = '\u0000other'

// ------------------------------------------------------------- measuring

/** The numbers of a value (lists give each item; blanks and text don't count). */
function numbersIn(value: FValue): number[] {
  const items = Array.isArray(value) ? flatten(value) : [value]
  return items.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  )
}

/** Adds rows up as the measure says; null = nothing to measure. */
function measureRows(
  rows: readonly ResolvedRow[],
  measure: Measure,
  valueColumnId: string | undefined,
): number | null {
  if (measure === 'count') return rows.length
  if (!valueColumnId) return null
  let sum = 0
  let n = 0
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    for (const v of numbersIn(row.values[valueColumnId] ?? null)) {
      sum += v
      n++
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (n === 0) return measure === 'sum' ? 0 : null
  if (measure === 'sum') return sum
  if (measure === 'average') return sum / n
  return measure === 'min' ? min : max
}

// --------------------------------------------------------------- grouping

interface Bucket {
  key: string
  label: string
  color?: string
  special?: 'empty'
  order: number
  rows: ResolvedRow[]
}

/** The groups one row falls in (a Choices row can be in several). */
function groupKeys(
  value: FValue,
  column: DbColumn | undefined,
): { key: string; label: string }[] {
  if (column?.type === 'checkbox') {
    const on = value === true
    return [{ key: on ? 'true' : 'false', label: on ? '✓' : '' }]
  }
  const items = (Array.isArray(value) ? flatten(value) : [value]).filter(
    (v) => !isBlank(v) && !isError(v),
  )
  if (items.length === 0) return [{ key: EMPTY_KEY, label: '' }]
  const seen = new Set<string>()
  return items.flatMap((v) => {
    const label = cellText(v, column)
    const key = isDate(v) ? dayOf(v) : label
    if (seen.has(key)) return []
    seen.add(key)
    return [{ key, label }]
  })
}

function groupData(
  spec: ChartSpec,
  rows: readonly ResolvedRow[],
  columns: readonly DbColumn[],
  limit: number,
): ChartData {
  const groupId = spec.groupColumnId
  if (!groupId)
    return { kind: 'groups', groups: [], more: 0, rows: rows.length }
  const measure = (list: readonly ResolvedRow[]) =>
    measureRows(list, spec.measure, spec.valueColumnId)

  // One bar per row: the biggest first, the rest counted as "more".
  if (groupId === TITLE_COLUMN_ID) {
    const groups: ChartGroup[] = rows.map((row) => ({
      key: row.page.id,
      label: row.page.title,
      value: measure([row]),
      rows: 1,
    }))
    groups.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
    return {
      kind: 'groups',
      groups: groups.slice(0, limit),
      more: Math.max(0, groups.length - limit),
      rows: rows.length,
    }
  }

  const column = columns.find((c) => c.id === groupId)
  const buckets = new Map<string, Bucket>()
  // Choice options keep their own order and colour, also with no rows.
  const options = column ? choiceOptions(column) : []
  options.forEach((o, i) =>
    buckets.set(o.name, {
      key: o.name,
      label: o.name,
      color: o.color,
      order: i,
      rows: [],
    }),
  )
  if (column?.type === 'checkbox') {
    buckets.set('true', { key: 'true', label: '✓', order: 0, rows: [] })
    buckets.set('false', { key: 'false', label: '', order: 1, rows: [] })
  }
  for (const row of rows) {
    for (const { key, label } of groupKeys(
      row.values[groupId] ?? null,
      column,
    )) {
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = {
          key,
          label,
          order: Infinity,
          rows: [],
          ...(key === EMPTY_KEY && { special: 'empty' as const }),
        }
        buckets.set(key, bucket)
      }
      bucket.rows.push(row)
    }
  }

  const ordered = column?.type === 'checkbox' || options.length > 0
  let list = [...buckets.values()].map((b) => ({
    ...b,
    value: measure(b.rows),
  }))
  // Options and ticks keep their order; other values: biggest first.
  list.sort((a, b) => {
    if ((a.special === 'empty') !== (b.special === 'empty'))
      return a.special === 'empty' ? 1 : -1
    if (ordered && a.order !== b.order) return a.order - b.order
    return (
      (b.value ?? -Infinity) - (a.value ?? -Infinity) ||
      a.label.localeCompare(b.label)
    )
  })
  // Parts of a whole: empty slices say nothing.
  if (spec.kind !== 'bar') list = list.filter((b) => b.rows.length > 0)

  let groups: ChartGroup[] = list.map((b) => ({
    key: b.key,
    label: b.label,
    value: b.value,
    rows: b.rows.length,
    ...(b.color && { color: b.color }),
    ...(b.special && { special: b.special }),
  }))
  if (groups.length > limit) {
    const rest = list.slice(limit - 1)
    const restRows = [...new Set(rest.flatMap((b) => b.rows))]
    groups = [
      ...groups.slice(0, limit - 1),
      {
        key: OTHER_KEY,
        label: '',
        value: measure(restRows),
        rows: restRows.length,
        special: 'other',
      },
    ]
  }
  return { kind: 'groups', groups, more: 0, rows: rows.length }
}

// ------------------------------------------------------------------- time

const DAY = 86_400_000
export const DAY_MS = DAY
const utc = (day: string) => Date.parse(`${day}T00:00:00Z`)
export const utcDay = utc
export const dayAt = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** The first day of the period a day falls in (weeks start on Monday). */
export function periodStart(day: string, period: Period): string {
  if (period === 'day') return day
  if (period === 'month') return `${day.slice(0, 7)}-01`
  const ms = utc(day)
  const weekday = (new Date(ms).getUTCDay() + 6) % 7 // Monday = 0
  return dayAt(ms - weekday * DAY)
}

/** The day a row is placed on (the first date of its value), or null. */
function rowDay(row: ResolvedRow, columnId: string): string | null {
  const value = row.values[columnId] ?? null
  const items = Array.isArray(value) ? flatten(value) : [value]
  const date = items.find(isDate)
  return date ? dayOf(date) : null
}

function seriesData(
  spec: ChartSpec,
  rows: readonly ResolvedRow[],
  today: string,
): ChartData {
  const period = spec.period ?? 'week'
  const dateId = spec.dateColumnId
  const byPeriod = new Map<string, ResolvedRow[]>()
  let latest = periodStart(today, period)
  let earliest = latest
  let dated = 0
  if (dateId) {
    for (const row of rows) {
      const day = rowDay(row, dateId)
      if (!day) continue
      dated++
      const key = periodStart(day, period)
      if (key > latest) latest = key
      if (key < earliest) earliest = key
      const list = byPeriod.get(key)
      if (list) list.push(row)
      else byPeriod.set(key, [row])
    }
  }
  // The newest periods, up to the limit, starting no earlier than the
  // first period with data (earlier ones would only be flat zeros).
  const keys: string[] = []
  for (let k = latest; keys.length < MAX_POINTS[period];) {
    keys.unshift(k)
    if (k <= earliest) break
    k = previousPeriod(k, period)
  }
  const points = keys.map((key) => {
    const list = byPeriod.get(key) ?? []
    return {
      key,
      day: key,
      value: measureRows(list, spec.measure, spec.valueColumnId),
      rows: list.length,
    }
  })
  return { kind: 'series', points, period, rows: dated }
}

export function previousPeriod(day: string, period: Period): string {
  if (period === 'day') return dayAt(utc(day) - DAY)
  if (period === 'week') return dayAt(utc(day) - 7 * DAY)
  const [y, m] = day.split('-').map(Number)
  return m === 1
    ? `${y - 1}-12-01`
    : `${y}-${String(m - 1).padStart(2, '0')}-01`
}

function heatmapData(
  spec: ChartSpec,
  rows: readonly ResolvedRow[],
  today: string,
): ChartData {
  // Whole weeks, Monday to Sunday, ending with this week.
  const first = dayAt(
    utc(periodStart(today, 'week')) - (HEAT_WEEKS - 1) * 7 * DAY,
  )
  const byDay = new Map<string, ResolvedRow[]>()
  let dated = 0
  if (spec.dateColumnId) {
    for (const row of rows) {
      const day = rowDay(row, spec.dateColumnId)
      if (!day || day < first) continue
      dated++
      const list = byDay.get(day)
      if (list) list.push(row)
      else byDay.set(day, [row])
    }
  }
  const days: HeatDay[] = []
  let max = 0
  let total = 0
  for (
    let i = 0, day = first;
    i < HEAT_WEEKS * 7;
    i++, day = dayAt(utc(day) + DAY)
  ) {
    const list = byDay.get(day) ?? []
    const value = list.length
      ? (measureRows(list, spec.measure, spec.valueColumnId) ?? 0)
      : 0
    days.push({ day, value, future: day > today })
    if (value > max) max = value
    total += value
  }
  return { kind: 'heatmap', days, max, total, rows: dated }
}

// ------------------------------------------------------------------- entry

/**
 * What one chart shows. `rows` are the database's resolved rows; the
 * chart's own filter is applied here. `now` sets "today".
 */
export function chartData(
  spec: ChartSpec,
  rows: readonly ResolvedRow[],
  columns: readonly DbColumn[],
  now: number = Date.now(),
  history?: ReviewHistory,
): ChartData {
  if (spec.history) return historyData(spec, history ?? new Map(), now)
  const kept = spec.filter
    ? queryRows(rows, columns, { filters: [spec.filter] })
    : rows
  const today = localDay(now)
  switch (spec.kind) {
    case 'number':
      return {
        kind: 'number',
        value: measureRows(kept, spec.measure, spec.valueColumnId),
        rows:
          spec.measure === 'count'
            ? kept.length
            : kept.filter(
                (row) =>
                  spec.valueColumnId !== undefined &&
                  numbersIn(row.values[spec.valueColumnId] ?? null).length > 0,
              ).length,
      }
    case 'bar':
    case 'donut':
    case 'progress':
      return groupData(spec, kept, columns, MAX_GROUPS[spec.kind])
    case 'line':
      return seriesData(spec, kept, today)
    case 'heatmap':
      return heatmapData(spec, kept, today)
  }
}
