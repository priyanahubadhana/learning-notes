import type { DbColumn } from '../../core/types'
import { dateLocale, t } from '../../i18n/t'
import { tagColorSlot } from './chartColors'
import { cellText } from '../cellDisplay'
import type { ChartGroup } from './chartData'
import type { ChartSpec, Period } from './chartSpec'

/**
 * How chart numbers and labels read: values in the measured column's
 * format, group names for empty / other / ticks, period names.
 */

const numberFormat = (digits: number, compact = false) =>
  new Intl.NumberFormat(dateLocale(), {
    maximumFractionDigits: digits,
    ...(compact && { notation: 'compact' }),
  })

/** A chart value as text ("—" when there is nothing to show). */
export function valueText(
  value: number | null,
  spec: Pick<ChartSpec, 'measure' | 'valueColumnId' | 'history'>,
  columns: readonly DbColumn[],
): string {
  if (value === null || !Number.isFinite(value)) return '—'
  if (spec.history === 'correct') return percentText(value, 1)
  if (spec.history === 'streak') {
    return t('tracker.streak.days', { count: value })
  }
  if (spec.measure === 'count') {
    return numberFormat(0, Math.abs(value) >= 100_000).format(value)
  }
  const column = columns.find((c) => c.id === spec.valueColumnId)
  const format =
    column?.type === 'trackerCorrect' ? 'percent' : column?.config.format
  // Stars: an average reads "3.4 ★", not rounded stars.
  if (format === 'stars') return `${numberFormat(1).format(value)} ★`
  if (format === 'percent' || format === 'currency') {
    return cellText(value, column)
  }
  return numberFormat(
    spec.measure === 'average' ? 1 : 2,
    Math.abs(value) >= 100_000,
  ).format(value)
}

/** A group's name on screen. */
export function groupText(group: ChartGroup, column?: DbColumn): string {
  if (group.special === 'empty') return t('dashboard.empty')
  if (group.special === 'other') return t('dashboard.other')
  if (column?.type === 'checkbox') {
    return group.key === 'true'
      ? t('dashboard.checked')
      : t('dashboard.notChecked')
  }
  return group.label.trim() || t('dashboard.untitled')
}

/**
 * A part's colour. Groups of a Choice column wear their option's colour
 * (grey if it has none); other groups take the fixed order. Empty, Other
 * and anything past six are grey.
 */
export function groupColor(
  group: ChartGroup,
  index: number,
  byOption: boolean,
): string {
  if (group.special) return 'var(--chart-none)'
  if (byOption) {
    const slot = group.color ? tagColorSlot(group.color) : null
    return slot ? `var(--chart-${slot})` : 'var(--chart-none)'
  }
  return index < 6 ? `var(--chart-${index + 1})` : 'var(--chart-none)'
}

/** "27 Oct", "Week of 26 Oct", "Oct 2026" for a period's first day. */
export function periodText(day: string, period: Period, long = false) {
  const ms = Date.parse(`${day}T00:00:00Z`)
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(dateLocale(), {
      ...options,
      timeZone: 'UTC',
    }).format(ms)
  if (period === 'month') return format({ month: 'short', year: 'numeric' })
  const short = format({ day: 'numeric', month: 'short' })
  return period === 'week' && long
    ? t('dashboard.weekOf', { day: short })
    : short
}

/** A share of a whole as "42 %". */
export function percentText(part: number, whole: number): string {
  return new Intl.NumberFormat(dateLocale(), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(whole > 0 ? part / whole : 0)
}
