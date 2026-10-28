import type { DbColumn, JsonValue } from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
import { cellText } from '../cellDisplay'
import { choiceOptions } from '../columnTypes'
import type { FilterOp, RowFilter } from '../databaseQuery'

/**
 * What a column's header menu offers: which filters, how sorting reads
 * ("A → Z", "Oldest first" …) and how a filter reads as a chip. `null`
 * stands for the title column.
 */

/** What a filter asks for: nothing, typed text, a number, a day or options. */
export type FilterInput = 'none' | 'text' | 'number' | 'date' | 'options'

export interface FilterChoice {
  op: FilterOp
  input: FilterInput
}

type Kind = 'text' | 'number' | 'date' | 'checkbox' | 'choice' | 'any'

const KIND_BY_TYPE: Record<string, Kind> = {
  text: 'text',
  url: 'text',
  tag: 'text',
  noteLink: 'text',
  relation: 'text',
  number: 'number',
  date: 'date',
  checkbox: 'checkbox',
  choice: 'choice',
  choices: 'choice',
  // Study tracker auto columns.
  trackerStatus: 'choice',
  trackerCardsDue: 'number',
  trackerCorrect: 'number',
  trackerLastRevised: 'date',
  trackerLevels: 'text',
}

const empties: FilterChoice[] = [
  { op: 'isEmpty', input: 'none' },
  { op: 'isNotEmpty', input: 'none' },
]

const CHOICES: Record<Kind, FilterChoice[]> = {
  text: [
    { op: 'contains', input: 'text' },
    { op: 'notContains', input: 'text' },
    { op: 'is', input: 'text' },
    { op: 'startsWith', input: 'text' },
    ...empties,
  ],
  number: [
    { op: 'is', input: 'number' },
    { op: 'gt', input: 'number' },
    { op: 'lt', input: 'number' },
    { op: 'gte', input: 'number' },
    { op: 'lte', input: 'number' },
    ...empties,
  ],
  date: [
    { op: 'is', input: 'date' },
    { op: 'before', input: 'date' },
    { op: 'after', input: 'date' },
    { op: 'onOrBefore', input: 'date' },
    { op: 'onOrAfter', input: 'date' },
    ...empties,
  ],
  checkbox: [
    { op: 'isChecked', input: 'none' },
    { op: 'isNotChecked', input: 'none' },
  ],
  choice: [
    { op: 'isAnyOf', input: 'options' },
    { op: 'isNoneOf', input: 'options' },
    ...empties,
  ],
  // Formulas, rollups and auto columns: their values can be of any kind.
  any: [
    { op: 'contains', input: 'text' },
    { op: 'is', input: 'text' },
    { op: 'gt', input: 'number' },
    { op: 'lt', input: 'number' },
    ...empties,
  ],
}

function kindOf(column: DbColumn | null): Kind {
  return column ? (KIND_BY_TYPE[column.type] ?? 'any') : 'text'
}

const isPercent = (column: DbColumn | null | undefined) =>
  column?.config.format === 'percent' || column?.type === 'trackerCorrect'

/** The filters a column offers, in menu order. */
export function filterChoices(column: DbColumn | null): FilterChoice[] {
  return CHOICES[kindOf(column)]
}

const isStars = (column: DbColumn | null) =>
  column?.type === 'number' && column.config.format === 'stars'

/** "contains", "at least", "has no rating" … */
export function opLabel(op: FilterOp, column: DbColumn | null = null): string {
  if (isStars(column) && op === 'isEmpty') return t('filter.op.noRating')
  if (isStars(column) && op === 'isNotEmpty') return t('filter.op.hasRating')
  return t(`filter.op.${op}` as MessageKey)
}

const SORT_LABELS: Record<Kind, [MessageKey, MessageKey]> = {
  text: ['sort.az', 'sort.za'],
  number: ['sort.lowHigh', 'sort.highLow'],
  date: ['sort.oldNew', 'sort.newOld'],
  checkbox: ['sort.uncheckedFirst', 'sort.checkedFirst'],
  choice: ['sort.optionOrder', 'sort.reverseOrder'],
  any: ['sort.az', 'sort.za'],
}

/** How ascending and descending read for this column. */
export function sortLabels(column: DbColumn | null): [string, string] {
  const [up, down] = SORT_LABELS[kindOf(column)]
  return [t(up), t(down)]
}

/** A filter value as it reads in a chip (a day, ★★★☆☆, option names …). */
function valueText(column: DbColumn | null, value: JsonValue | undefined) {
  if (value === undefined || value === null) return ''
  const kind = kindOf(column)
  if (kind === 'choice' && column) {
    const options = choiceOptions(column)
    const ids = Array.isArray(value) ? value : [value]
    return ids
      .map((id) => options.find((o) => o.id === id)?.name ?? String(id))
      .join(t('filter.or'))
  }
  if (kind === 'date' && typeof value === 'string') {
    return cellText({ date: value })
  }
  if (kind === 'number' && typeof value === 'number' && column) {
    return cellText(value, column)
  }
  return typeof value === 'string' ? `“${value}”` : String(value)
}

/** A filter as a chip: "Confidence is at least ★★★☆☆". */
export function filterLabel(
  filter: RowFilter,
  column: DbColumn | null,
  columnName: string,
): string {
  return t('filter.chip', {
    column: columnName,
    op: opLabel(filter.op, column),
    value: valueText(column, filter.value),
  }).trim()
}

/**
 * A typed number as stored: percent columns keep fractions, so "75"
 * typed for a % column is 0.75. Null if it is not a number.
 */
export function typedNumber(text: string, column: DbColumn | null) {
  const n = Number(text.trim().replace(/,/g, ''))
  if (text.trim() === '' || !Number.isFinite(n)) return null
  return isPercent(column) ? n / 100 : n
}

/**
 * What a number box keeps while typing: digits, one "-" at the start, and
 * the separators `typedNumber` understands. Letters and other signs are
 * dropped as they are typed.
 */
export function numberTyping(text: string): string {
  const cleaned = text.replace(/[^0-9.,-]/g, '')
  return (cleaned.startsWith('-') ? '-' : '') + cleaned.replace(/-/g, '')
}

/** A stored number as typed (the reverse of `typedNumber`). */
export function numberForInput(n: number, column: DbColumn | null): string {
  return String(isPercent(column) ? Math.round(n * 1e10) / 1e8 : n)
}
