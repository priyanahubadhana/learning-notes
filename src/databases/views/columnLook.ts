import { t, type MessageKey } from '../../i18n/t'
import type { DbColumn } from '../../core/types'

/**
 * How a column looks in view headers and menus: its type icon, and
 * whether the app fills it in ("auto", e.g. the Study tracker's Status).
 */

const TYPE_ICONS: Record<string, string> = {
  text: 'T',
  number: '#',
  date: '▣',
  choice: '◉',
  choices: '◎',
  checkbox: '☑',
  url: '🔗',
  tag: '#',
  noteLink: '↗',
  formula: 'ƒ',
  relation: '⇄',
  rollup: 'Σ',
}

/** Study tracker columns filled from cards and reviews. */
const AUTO_TYPES = new Set([
  'trackerStatus',
  'trackerLastRevised',
  'trackerCardsDue',
  'trackerCorrect',
  'trackerLevels',
])

export function columnIcon(column: DbColumn): string {
  if (column.type === 'number') {
    if (column.config.format === 'stars') return '★'
    if (column.config.format === 'percent') return '%'
  }
  if (AUTO_TYPES.has(column.type)) return '◔'
  return TYPE_ICONS[column.type] ?? '·'
}

/** True if the app fills the column in (never typed in by the user). */
export function isAutoColumn(column: DbColumn): boolean {
  return AUTO_TYPES.has(column.type)
}

/** A column type's name: "Number", "Web link" … */
export const typeName = (type: string): string =>
  t(`column.type.${type}` as MessageKey)
