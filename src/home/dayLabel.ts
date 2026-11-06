import { parseDayKey } from '../core/homeDays'
import { dateLocale } from '../i18n/t'

/** "Sun 25 Oct" from a "YYYY-MM-DD" day, in the app's language. */
export function shortDayLabel(key: string): string {
  const d = parseDayKey(key)
  if (!d) return key
  return d.toLocaleDateString(dateLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "7 Nov" (no weekday). */
export function dayMonthLabel(key: string): string {
  const d = parseDayKey(key)
  if (!d) return key
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })
}
