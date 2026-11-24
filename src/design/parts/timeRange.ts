import { dateLocale } from '../../i18n/t'

/** Pure range maths for the Time range bar (SP-10). Dates are local "YYYY-MM-DD". */

export type PresetKind =
  | 'day'
  | 'week'
  | 'month'
  | 'lastmonth'
  | 'quarter'
  | 'year'
  | 'last7'
  | 'last30'
  | 'last4w'
  | 'custom'

export type Preset = {
  id: string
  label: string
  kind: PresetKind
  from?: string
  to?: string
}

export type DateRange = { from: string; to: string }

/** 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1

const pad = (n: number) => String(n).padStart(2, '0')

/** Calendar maths on a UTC-based number, so daylight saving never shifts a day. */
type Ymd = { y: number; m: number; d: number }

export function parseYmd(s: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = +m[1]
  const mo = +m[2]
  const d = +m[3]
  const check = new Date(Date.UTC(y, mo - 1, d))
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  )
    return null
  return { y, m: mo, d }
}

export const formatYmd = ({ y, m, d }: Ymd): string =>
  `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`

/** Today's date in the person's own time zone, as "YYYY-MM-DD". */
export const todayYmd = (now: Date = new Date()): string =>
  formatYmd({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() })

const toUtc = ({ y, m, d }: Ymd) => Date.UTC(y, m - 1, d)
const fromUtc = (ms: number): Ymd => {
  const dt = new Date(ms)
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  }
}
const DAY = 86_400_000

/** `days` after (or before, if negative) a date. */
export function addDays(date: string, days: number): string {
  const p = parseYmd(date)
  if (!p) throw new Error(`timeRange: bad date ${date}`)
  return formatYmd(fromUtc(toUtc(p) + days * DAY))
}

export const isLeapYear = (y: number): boolean =>
  (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28
  return [4, 6, 9, 11].includes(m) ? 30 : 31
}

/** 0 = Sunday ... 6 = Saturday. */
const weekday = (p: Ymd) => new Date(toUtc(p)).getUTCDay()

/** The range a preset covers on `today`. Custom presets keep their own dates. */
export function rangeFor(
  preset: Pick<Preset, 'kind' | 'from' | 'to'>,
  today: string,
  weekStart: WeekStart = 1,
): DateRange {
  const t = parseYmd(today)
  if (!t) throw new Error(`timeRange: bad date ${today}`)
  switch (preset.kind) {
    case 'day':
      return { from: today, to: today }
    case 'week': {
      const back = (weekday(t) - weekStart + 7) % 7
      const from = addDays(today, -back)
      return { from, to: addDays(from, 6) }
    }
    case 'month':
      return {
        from: formatYmd({ ...t, d: 1 }),
        to: formatYmd({ ...t, d: daysInMonth(t.y, t.m) }),
      }
    case 'lastmonth': {
      const y = t.m === 1 ? t.y - 1 : t.y
      const m = t.m === 1 ? 12 : t.m - 1
      return {
        from: formatYmd({ y, m, d: 1 }),
        to: formatYmd({ y, m, d: daysInMonth(y, m) }),
      }
    }
    case 'quarter': {
      const first = Math.floor((t.m - 1) / 3) * 3 + 1
      return {
        from: formatYmd({ y: t.y, m: first, d: 1 }),
        to: formatYmd({ y: t.y, m: first + 2, d: daysInMonth(t.y, first + 2) }),
      }
    }
    case 'year':
      return {
        from: formatYmd({ y: t.y, m: 1, d: 1 }),
        to: formatYmd({ y: t.y, m: 12, d: 31 }),
      }
    case 'last7':
      return { from: addDays(today, -6), to: today }
    case 'last30':
      return { from: addDays(today, -29), to: today }
    case 'last4w':
      return { from: addDays(today, -27), to: today }
    case 'custom':
      return { from: preset.from ?? today, to: preset.to ?? today }
  }
}

/** True when both dates are real and the end is not before the start. */
export function isValidRange(from: string, to: string): boolean {
  return !!parseYmd(from) && !!parseYmd(to) && from <= to
}

/** The built-in presets, in the order the bar offers them. */
export const PRESET_KINDS: { id: string; kind: PresetKind }[] = [
  { id: 'today', kind: 'day' },
  { id: 'week', kind: 'week' },
  { id: 'month', kind: 'month' },
  { id: 'lastmonth', kind: 'lastmonth' },
  { id: 'quarter', kind: 'quarter' },
  { id: 'year', kind: 'year' },
  { id: 'last7', kind: 'last7' },
  { id: 'last30', kind: 'last30' },
  { id: 'last4w', kind: 'last4w' },
  { id: 'custom', kind: 'custom' },
]

/** "12-18 Nov 2026", "28 Oct - 3 Nov 2026", "30 Dec 2026 - 2 Jan 2027", "12 Nov 2026". */
export function formatRange(
  { from, to }: DateRange,
  locale: string = dateLocale(),
): string {
  const a = parseYmd(from)
  const b = parseYmd(to)
  if (!a || !b) return ''
  const fmt = (p: Ymd, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' }).format(
      new Date(toUtc(p)),
    )
  const full: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
  if (from === to) return fmt(a, full)
  if (a.y !== b.y) return `${fmt(a, full)} - ${fmt(b, full)}`
  if (a.m === b.m) {
    const dayA = fmt(a, { day: 'numeric' })
    return `${dayA}-${fmt(b, full)}`
  }
  const noYear: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${fmt(a, noYear)} - ${fmt(b, full)}`
}
