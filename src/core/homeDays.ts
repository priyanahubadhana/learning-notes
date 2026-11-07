import { DEFAULT_DAY_START_HOUR, studyDayStart } from './time'

/**
 * Days of the Home cockpit: local "YYYY-MM-DD" keys that roll over at the
 * "Day starts at" hour (default 4 am), so a task done at 1 am still belongs
 * to the evening before. Pure, so it is tested without a database.
 */

const pad = (n: number) => String(n).padStart(2, '0')

const keyOfDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** The Home day that contains `now`. */
export function dayKeyOf(
  now: number,
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): string {
  return keyOfDate(new Date(studyDayStart(now, dayStartHour)))
}

/** Parses a key; null when it is not a real calendar day. */
export function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return keyOfDate(d) === key ? d : null
}

/** The day `n` days after (or before, negative) `key`. */
export function addDays(key: string, n: number): string {
  const d = parseDayKey(key) ?? new Date()
  d.setDate(d.getDate() + n)
  return keyOfDate(d)
}

/** 0 = Sunday … 6 = Saturday. */
function weekdayOf(key: string): number {
  return (parseDayKey(key) ?? new Date()).getDay()
}

/** The next date after `from` that falls on `weekday` (always in the future). */
export function nextWeekday(from: string, weekday: number): string {
  const diff = (weekday - weekdayOf(from) + 7) % 7 || 7
  return addDays(from, diff)
}

/** Whole days from `a` to `b` (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = parseDayKey(a)
  const db = parseDayKey(b)
  if (!da || !db) return 0
  return Math.round(
    (Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) -
      Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) /
      86_400_000,
  )
}

/** Monday of the week that holds `key` (weeks run Monday to Sunday). */
export function weekStart(key: string): string {
  const wd = weekdayOf(key)
  return addDays(key, wd === 0 ? -6 : 1 - wd)
}

/** The 7 days ending on `key`, oldest first. */
export function lastDays(key: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => addDays(key, i - count + 1))
}
