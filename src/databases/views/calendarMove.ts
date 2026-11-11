import { DAY_MS, utcDay } from '../dashboard/chartData'
import { localDay } from '../formula/formulaValue'
import { addDays } from './calendarData'

/**
 * Moving a row on the calendar: its Date cell(s) shift by whole days. Days
 * are "YYYY-MM-DD" and move by calendar arithmetic (UTC-safe). A date with a
 * time (a UTC moment) moves to the new day in the user's time zone and keeps
 * the same local clock time.
 */

/** The start (and, for a multi-day row, end) cells of a row. */
export interface DateCells {
  start: string
  end: string | null
}

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/
const EARLIEST = '1000-01-01'

/** Whole days from one day to another (negative = earlier). */
export const dayDelta = (from: string, to: string): number =>
  Math.round((utcDay(to) - utcDay(from)) / DAY_MS)

/** A stored date moved by `delta` days; null if the result is out of range. */
export function movedDate(value: string, delta: number): string | null {
  if (DAY_ONLY.test(value)) {
    const day = addDays(value, delta)
    return DAY_ONLY.test(day) && day >= EARLIEST ? day : null
  }
  const ms = Date.parse(value)
  if (Number.isNaN(ms)) return null
  const from = new Date(ms)
  const want = addDays(localDay(ms), delta)
  if (!DAY_ONLY.test(want) || want < EARLIEST) return null
  const at = (hours: number, same: boolean) =>
    new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate() + delta,
      hours,
      same ? from.getMinutes() : 0,
      same ? from.getSeconds() : 0,
      same ? from.getMilliseconds() : 0,
    )
  // The same clock time on the new day; if that time does not exist there
  // (a clock change), noon of that day.
  let moved = at(from.getHours(), true)
  if (localDay(moved.getTime()) !== want) moved = at(12, false)
  return moved.toISOString()
}

/** Both cells moved by the same number of days, or null if either cannot. */
export function shiftCells(cells: DateCells, delta: number): DateCells | null {
  const start = movedDate(cells.start, delta)
  if (!start) return null
  if (cells.end === null) return { start, end: null }
  const end = movedDate(cells.end, delta)
  return end ? { start, end } : null
}

/** The cell changes that set a row's dates (for `setCells`). */
export function cellChanges(
  startColumnId: string,
  endColumnId: string | null,
  cells: DateCells,
): Record<string, string> {
  return {
    [startColumnId]: cells.start,
    ...(endColumnId && cells.end !== null && { [endColumnId]: cells.end }),
  }
}
