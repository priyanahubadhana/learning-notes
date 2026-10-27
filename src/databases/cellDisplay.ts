import type { DbColumn } from '../core/types'
import { dateLocale, t, type MessageKey } from '../i18n/t'
import type { ResolvedRow } from './databaseQuery'
import { cardsDueText } from './trackerStats'
import {
  isBlank,
  isDate,
  isError,
  numberText,
  type FValue,
  type FormulaError,
} from './formula/formulaValue'

/**
 * How a worked-out cell value reads on screen (tables, cards, charts):
 * numbers in the column's format, dates in the user's style, errors as a
 * short message. Pure, so every view shows values the same way.
 */

/** Stars a "★" Number column can hold (unless `config.max` says other). */
export const DEFAULT_STAR_MAX = 5

export function starMax(column: DbColumn): number {
  return typeof column.config.max === 'number'
    ? column.config.max
    : DEFAULT_STAR_MAX
}

/** The message for a formula error, e.g. "No column called [Dose]". */
export function errorText(error: FormulaError): string {
  return t(`formula.error.${error.error}` as MessageKey, {
    detail: error.detail ?? '',
  })
}

function numberDisplay(n: number, column: DbColumn | undefined): string {
  const format =
    column?.type === 'trackerCorrect' ? 'percent' : column?.config.format
  if (format === 'percent') {
    return new Intl.NumberFormat(dateLocale(), {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(n)
  }
  if (format === 'currency' && typeof column?.config.currency === 'string') {
    try {
      return new Intl.NumberFormat(dateLocale(), {
        style: 'currency',
        currency: column.config.currency,
      }).format(n)
    } catch {
      // Unknown currency code: plain number below.
    }
  }
  if (format === 'stars' && column) {
    const max = starMax(column)
    const full = Math.max(0, Math.min(max, Math.round(n)))
    return '★'.repeat(full) + '☆'.repeat(max - full)
  }
  if (!Number.isFinite(n)) return numberText(n)
  return new Intl.NumberFormat(dateLocale(), {
    maximumFractionDigits: 10,
  }).format(n)
}

function dateDisplay(text: string): string {
  // A day ("YYYY-MM-DD") is shown as that day wherever the user is; a
  // moment (ISO time) in the user's own time zone.
  const day = /^\d{4}-\d{2}-\d{2}$/.test(text)
  const ms = Date.parse(day ? `${text}T00:00:00Z` : text)
  if (Number.isNaN(ms)) return text
  return new Intl.DateTimeFormat(dateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(day ? { timeZone: 'UTC' } : { hour: 'numeric', minute: '2-digit' }),
  }).format(ms)
}

/** A row's cell as text; a tracker lesson's Cards due reads "5 due · 20 new". */
export function rowCellText(row: ResolvedRow, column: DbColumn): string {
  if (row.tracker && column.type === 'trackerCardsDue') {
    return cardsDueText(row.tracker.stats)
  }
  return cellText(row.values[column.id] ?? null, column)
}

/**
 * A cell value as text. `column` gives number formats; list items are
 * joined with ", ". Checkboxes read ✓ / blank; blank values read "".
 */
export function cellText(value: FValue, column?: DbColumn): string {
  if (isBlank(value)) return ''
  if (isError(value)) return errorText(value)
  if (Array.isArray(value)) {
    return value
      .filter((v) => !isBlank(v))
      .map((v) => cellText(v, column))
      .join(', ')
  }
  if (isDate(value)) return dateDisplay(value.date)
  if (typeof value === 'number') return numberDisplay(value, column)
  if (typeof value === 'boolean') return value ? '✓' : ''
  return typeof value === 'string' ? value : ''
}
