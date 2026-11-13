import { isFlagOn } from './flags'
import { isIconName, type IconName } from './tools/icons'
import { holdMenuSetting } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'

/** The old long-press time (ms), kept while flag page.menus is off. */
const OLD_HOLD_MS = 500

/**
 * How long a row must be held before its menu opens (PM-24). With flag
 * page.menus it follows Settings "Press-and-hold menu time"; otherwise 500 ms.
 */
export function rowHoldMs(): number {
  return isFlagOn('page.menus')
    ? readDeviceSetting(holdMenuSetting)
    : OLD_HOLD_MS
}

const CHAR_ICONS: Record<string, IconName> = {
  '✎': 'pencil',
  '+': 'plus',
  '☆': 'star',
  '★': 'star',
  '↑': 'chevronUp',
  '↓': 'chevronDown',
  '↰': 'arrowUpRight',
  '×': 'close',
}

/** A menu row's icon as a strip icon (unknown ones become "more"). */
export function stripIcon(icon: string): IconName {
  if (isIconName(icon)) return icon
  return CHAR_ICONS[icon] ?? 'more'
}

/** Where the press was (screen pixels). */
export type RowPoint = { x: number; y: number }
