import { dateLocale } from '../../i18n/t'
import type { ResolvedRow } from '../databaseQuery'
import {
  dayAt,
  DAY_MS,
  periodStart,
  rowDay,
  utcDay,
} from '../dashboard/chartData'

/**
 * Calendar view rules, apart from the screen: which days a month or week
 * shows, and which rows fall on each day. Days are "YYYY-MM-DD" strings;
 * weeks start on Monday.
 */

export type CalendarMode = 'month' | 'week'

export interface CalendarDay<T = ResolvedRow> {
  day: string
  /** In the shown month (always true in week mode). */
  inPeriod: boolean
  rows: T[]
}

/** The first day of the month a day is in. */
export const monthStart = (day: string): string => `${day.slice(0, 7)}-01`

/** The day `by` days after `day`. */
export const addDays = (day: string, by: number): string =>
  dayAt(utcDay(day) + by * DAY_MS)

/** The same day one month earlier/later, kept inside the month's length. */
export function addMonths(day: string, by: number): string {
  const [y, m] = day.split('-').map(Number)
  const index = y * 12 + (m - 1) + by
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const d = Math.min(Number(day.slice(8, 10)), last)
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Moves the shown period: a month or a week back (-1) or forward (1). */
export const shift = (
  anchor: string,
  mode: CalendarMode,
  by: -1 | 1,
): string =>
  mode === 'month' ? addMonths(anchor, by) : addDays(anchor, 7 * by)

/** Rows by the day their date column places them on (rows without a date left out). */
export function rowsByDay(
  rows: readonly ResolvedRow[],
  dateColumnId: string,
): { byDay: Map<string, ResolvedRow[]>; undated: number } {
  const byDay = new Map<string, ResolvedRow[]>()
  let undated = 0
  for (const row of rows) {
    const day = rowDay(row, dateColumnId)
    if (!day) {
      undated++
      continue
    }
    const list = byDay.get(day)
    if (list) list.push(row)
    else byDay.set(day, [row])
  }
  return { byDay, undated }
}

/**
 * The days to draw for the period around `anchor`: whole weeks (Monday to
 * Sunday) covering the month, or the one week.
 */
export function calendarDays<T = ResolvedRow>(
  byDay: ReadonlyMap<string, T[]>,
  anchor: string,
  mode: CalendarMode,
): CalendarDay<T>[] {
  let first: string
  let count: number
  if (mode === 'week') {
    first = periodStart(anchor, 'week')
    count = 7
  } else {
    first = periodStart(monthStart(anchor), 'week')
    const month = monthStart(anchor)
    const lastOfMonth = addDays(addMonths(month, 1), -1)
    count =
      Math.ceil((utcDay(lastOfMonth) - utcDay(first)) / DAY_MS / 7 + 1 / 7) * 7
  }
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(first, i)
    return {
      day,
      inPeriod: mode === 'week' || day.slice(0, 7) === anchor.slice(0, 7),
      rows: byDay.get(day) ?? [],
    }
  })
}

/** A day as "27 Oct" (or "Oct 27") in the user's date style. */
export const dayText = (day: string, long = false): string =>
  new Intl.DateTimeFormat(dateLocale(), {
    day: 'numeric',
    month: long ? 'long' : 'short',
    ...(long && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(Date.parse(`${day}T00:00:00Z`))

export const weekdayText = (day: string): string =>
  new Intl.DateTimeFormat(dateLocale(), {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(Date.parse(`${day}T00:00:00Z`))

/** "October 2026" for the month a day is in. */
export const monthTitle = (day: string): string =>
  new Intl.DateTimeFormat(dateLocale(), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(Date.parse(`${monthStart(day)}T00:00:00Z`))
