import { dateLocale } from '../i18n/t'
/**
 * Date helpers for the journal. Keys use the device's local date, so "today"
 * matches the user's calendar. Titles use the app language when created, and
 * the sidebar's labels always use the current one.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** "YYYY-MM-DD" for a local date. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "YYYY-MM" for a local date. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

/** Page title for a day, e.g. "Sunday 25 October 2026". */
export function dayTitle(date: Date): string {
  return date.toLocaleDateString(dateLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Page title for a month, e.g. "October 2026". */
export function monthTitle(date: Date): string {
  return date.toLocaleDateString(dateLocale(), {
    month: 'long',
    year: 'numeric',
  })
}

/** Short label for the sidebar, e.g. "Sun 25 Oct", from a "YYYY-MM-DD" key. */
export function shortDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Label for the sidebar, e.g. "October 2026", from a "YYYY-MM" key. */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return monthTitle(new Date(y, m - 1, 1))
}
