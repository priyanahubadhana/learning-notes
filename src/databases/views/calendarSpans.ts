import { dateLocale } from '../../i18n/t'
import type { ResolvedRow } from '../databaseQuery'
import { utcDay, rowDay } from '../dashboard/chartData'
import { addDays, addMonths } from './calendarData'

/**
 * Calendar spans, week lanes and the Year view's numbers, apart from the
 * screen. Days are "YYYY-MM-DD" strings compared as text (which sorts the
 * same as the calendar) and moved by UTC calendar maths, so time zones never
 * shift a day.
 */

/** A row's span is never drawn longer than this (a year). */
export const MAX_SPAN_DAYS = 366

/** A row on the calendar: from its start day to its end day (both included). */
export interface DaySpan<T = ResolvedRow> {
  row: T
  start: string
  end: string
}

/**
 * Rows as day spans. The end comes from an optional second Date column; a
 * missing end, or one before the start, makes a one-day span. Rows with no
 * start day are counted apart. Spans longer than a year are cut short.
 */
export function rowSpans(
  rows: readonly ResolvedRow[],
  startColumnId: string,
  endColumnId: string | null,
): { spans: DaySpan[]; undated: number } {
  const spans: DaySpan[] = []
  let undated = 0
  for (const row of rows) {
    const start = rowDay(row, startColumnId)
    if (!start) {
      undated++
      continue
    }
    let end = endColumnId ? rowDay(row, endColumnId) : null
    if (!end || end < start) end = start
    const limit = addDays(start, MAX_SPAN_DAYS - 1)
    spans.push({ row, start, end: end > limit ? limit : end })
  }
  return { spans, undated }
}

/** The spans that touch the days `first`..`last`. */
export const spansInRange = <T>(
  spans: readonly DaySpan<T>[],
  first: string,
  last: string,
): DaySpan<T>[] => spans.filter((s) => s.start <= last && s.end >= first)

/** One drawn piece of a span inside one day. */
export interface LaneChip<T> {
  span: DaySpan<T>
  startsHere: boolean
  endsHere: boolean
  /** The title is written here (first day, or first day of the week row). */
  showLabel: boolean
}

export interface DayLanes<T> {
  day: string
  /** One entry per lane, the same count on all 7 days; null = empty lane. */
  slots: (LaneChip<T> | null)[]
  /** Spans on this day that did not fit in `maxLanes`. */
  hidden: number
  /** Every span on this day, in lane order. */
  all: DaySpan<T>[]
}

const earlier = (a: string, b: string) => (a < b ? a : b)
const later = (a: string, b: string) => (a > b ? a : b)

/**
 * Lays one week (7 days from `weekFirst`) out in lanes, so a span keeps the
 * same lane on every day it covers. Earlier starts first, then longer spans.
 */
export function weekLanes<T extends { page: { id: string } }>(
  spans: readonly DaySpan<T>[],
  weekFirst: string,
  maxLanes: number,
): DayLanes<T>[] {
  const weekLast = addDays(weekFirst, 6)
  const inWeek = spansInRange(spans, weekFirst, weekLast).sort(
    (a, b) =>
      later(a.start, weekFirst).localeCompare(later(b.start, weekFirst)) ||
      earlier(b.end, weekLast).localeCompare(earlier(a.end, weekLast)) ||
      a.row.page.id.localeCompare(b.row.page.id),
  )
  const laneEnds: string[] = []
  const laneOf = new Map<DaySpan<T>, number>()
  for (const span of inWeek) {
    const from = later(span.start, weekFirst)
    let lane = laneEnds.findIndex((end) => end < from)
    if (lane < 0) lane = laneEnds.length
    laneEnds[lane] = earlier(span.end, weekLast)
    laneOf.set(span, lane)
  }
  const count = Math.min(maxLanes, laneEnds.length)
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekFirst, i)
    const slots: (LaneChip<T> | null)[] = Array.from(
      { length: count },
      () => null,
    )
    const all: DaySpan<T>[] = []
    let hidden = 0
    for (const span of inWeek) {
      if (span.start > day || span.end < day) continue
      all.push(span)
      const lane = laneOf.get(span)!
      if (lane >= count) {
        hidden++
        continue
      }
      slots[lane] = {
        span,
        startsHere: span.start === day,
        endsHere: span.end === day,
        showLabel: span.start === day || i === 0,
      }
    }
    return { day, slots, hidden, all }
  })
}

// ------------------------------------------------------------------- year

export interface MiniDay {
  day: string
  /** Rows on this day. */
  count: number
}

export interface MiniMonth {
  /** First day of the month, "YYYY-MM-01". */
  month: string
  /** Blank cells before day 1 (weeks start on Monday). */
  lead: number
  days: MiniDay[]
}

/** How many rows fall on each day of `first`..`last` (spans count every day). */
export function dayCounts<T>(
  spans: readonly DaySpan<T>[],
  first: string,
  last: string,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const span of spansInRange(spans, first, last)) {
    const to = earlier(span.end, last)
    for (let day = later(span.start, first); day <= to; day = addDays(day, 1)) {
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
  }
  return counts
}

const pad4 = (year: number) => String(year).padStart(4, '0')

/** The first and last day of a year. */
export const yearBounds = (year: number): [string, string] => [
  `${pad4(year)}-01-01`,
  `${pad4(year)}-12-31`,
]

/** The 12 months of a year, for the Year view. */
export function yearMonths(
  year: number,
  counts: ReadonlyMap<string, number>,
): MiniMonth[] {
  return Array.from({ length: 12 }, (_, m) => {
    const month = `${pad4(year)}-${String(m + 1).padStart(2, '0')}-01`
    const length = new Date(Date.UTC(year, m + 1, 0)).getUTCDate()
    const lead = (new Date(utcDay(month)).getUTCDay() + 6) % 7
    const days = Array.from({ length }, (_, d) => {
      const day = `${month.slice(0, 8)}${String(d + 1).padStart(2, '0')}`
      return { day, count: counts.get(day) ?? 0 }
    })
    return { month, lead, days }
  })
}

/** The same day one year earlier/later (29 Feb becomes 28 Feb). */
export const addYears = (day: string, by: number): string =>
  addMonths(day, 12 * by)

const format = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(dateLocale(), {
    ...options,
    timeZone: 'UTC',
  }).format(Date.parse(`${day}T00:00:00Z`))

/** One letter for a weekday column of a mini month ("M", "T", ...). */
export const weekdayLetter = (day: string): string =>
  format(day, { weekday: 'narrow' })

/** "October" for the month a day is in. */
export const monthName = (day: string): string =>
  format(`${day.slice(0, 7)}-01`, { month: 'long' })

/** "Tuesday 27 October 2026" for a day (read out for a screen reader). */
export const fullDayText = (day: string): string =>
  format(day, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
