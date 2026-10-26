/**
 * Values used by formulas, rollups, sorting and filtering of database rows.
 *
 * Every cell is read into one of these shapes, so formulas, views and
 * filters share a single set of rules (what is blank, how values compare).
 */

/** A calendar day ("YYYY-MM-DD") or a moment in time (UTC ISO string). */
export interface DateValue {
  date: string
}

/**
 * A formula error. `code` is a stable key the UI translates
 * (`formula.error.<code>`); `detail` is shown inside the message
 * (e.g. the unknown column name).
 */
export interface FormulaError {
  error: FormulaErrorCode
  detail?: string
}

export type FormulaErrorCode =
  | 'syntax'
  | 'tooLong'
  | 'tooDeep'
  | 'unknownColumn'
  | 'unknownFunction'
  | 'argCount'
  | 'notNumber'
  | 'notDate'
  | 'divZero'
  | 'cycle'
  | 'tooBig'

/** A value: blank (null), number, text, yes/no, date, list or error. */
export type FValue =
  null | number | string | boolean | DateValue | FormulaError | FValue[]

export const DAY_MS = 24 * 60 * 60 * 1000

/** Creates an error value. */
export function fail(error: FormulaErrorCode, detail?: string): FormulaError {
  return detail === undefined ? { error } : { error, detail }
}

export function isError(value: FValue): value is FormulaError {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'error' in value
  )
}

export function isDate(value: FValue): value is DateValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'date' in value
  )
}

/** Blank: nothing, empty text or an empty list. */
export function isBlank(value: FValue): boolean {
  return (
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.every(isBlank))
  )
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** True for a real calendar day written "YYYY-MM-DD". */
export function isDayString(text: string): boolean {
  const m = DAY_RE.exec(text)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1
}

/**
 * Turns user input into a stored date: a day stays "YYYY-MM-DD"; anything
 * with a time becomes a UTC ISO string. Returns null if it is not a date.
 */
export function normalizeDate(text: string): string | null {
  const trimmed = text.trim()
  if (DAY_RE.test(trimmed)) return isDayString(trimmed) ? trimmed : null
  if (!/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return null
  const ms = Date.parse(trimmed)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/**
 * A date as a number for comparing and maths. Days count from their UTC
 * midnight, so two days compare by calendar, whatever the time zone.
 */
export function dateToMs(value: DateValue): number {
  if (DAY_RE.test(value.date)) return Date.parse(`${value.date}T00:00:00Z`)
  return Date.parse(value.date)
}

/** The calendar day of a date: a day as-is, a moment in local time. */
export function dayOf(value: DateValue): string {
  if (DAY_RE.test(value.date)) return value.date
  return localDay(Date.parse(value.date))
}

/** "YYYY-MM-DD" of a moment, in the device's time zone. */
export function localDay(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "YYYY-MM-DD" of a UTC-midnight time (used by day maths). */
export function dayFromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Reads a value as a number; blank = 0, numeric text counts. */
export function toNumber(value: FValue): number | FormulaError {
  if (isError(value)) return value
  if (value === null || value === '') return 0
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const n = Number(value.trim())
    return Number.isFinite(n) ? n : fail('notNumber', value)
  }
  if (Array.isArray(value) && value.length === 1) return toNumber(value[0])
  return fail('notNumber', toText(value))
}

/** Shows a number without float noise (0.1 + 0.2 → "0.3"). */
export function numberText(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  return String(Number(n.toPrecision(12)))
}

/** Reads a value as text (lists joined with ", "). */
export function toText(value: FValue): string {
  if (value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return numberText(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) {
    return value
      .filter((v) => !isBlank(v))
      .map(toText)
      .join(', ')
  }
  if (isDate(value)) return value.date
  return `#${value.error}`
}

/** Yes/no reading: blank, 0, empty text and "false" are no. */
export function toBoolean(value: FValue): boolean {
  if (value === null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    return lower !== '' && lower !== 'false' && lower !== '0'
  }
  if (Array.isArray(value)) return value.some(toBoolean)
  return !isError(value)
}

/** Flattens nested lists into one list of single values. */
export function flatten(values: readonly FValue[]): FValue[] {
  const out: FValue[] = []
  for (const v of values) {
    if (Array.isArray(v)) out.push(...flatten(v))
    else out.push(v)
  }
  return out
}

/** Rank of each kind, so mixed values sort in a stable, sensible order. */
function kindRank(value: FValue): number {
  if (typeof value === 'number') return 0
  if (isDate(value)) return 1
  if (typeof value === 'string') return 2
  if (typeof value === 'boolean') return 3
  if (Array.isArray(value)) return 4
  return 5 // errors last
}

const collator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
})

/**
 * Compares two values (negative = a first). Blank values sort last in
 * either direction, so the caller handles them; here they count as equal.
 * Text compares by the user's language, ignoring case and accents.
 */
export function compareValues(a: FValue, b: FValue): number {
  const rank = kindRank(a) - kindRank(b)
  if (rank !== 0) return rank
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'string' && typeof b === 'string') {
    return collator.compare(a, b)
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b)
  }
  if (isDate(a) && isDate(b)) return dateToMs(a) - dateToMs(b)
  return collator.compare(toText(a), toText(b))
}

/** Equality for formulas and filters (text ignores case, blank = ""). */
export function valuesEqual(a: FValue, b: FValue): boolean {
  if (isBlank(a) || isBlank(b)) return isBlank(a) && isBlank(b)
  if (typeof a === 'number' || typeof b === 'number') {
    const x = toNumber(a)
    const y = toNumber(b)
    return typeof x === 'number' && typeof y === 'number' && x === y
  }
  if (isDate(a) && isDate(b)) return dateToMs(a) === dateToMs(b)
  return compareValues(a, b) === 0 && kindRank(a) === kindRank(b)
}
