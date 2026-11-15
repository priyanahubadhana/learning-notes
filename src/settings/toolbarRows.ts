import type { JsonValue } from '../core/types'
import { t, type MessageKey } from '../i18n/t'

/**
 * The tool bar rows of Settings (task 2A.14): the Layout shortcut and the five
 * parts. Both Settings screens draw them as in the approved picture: a short
 * line that follows the value, the control on the right, a "Tool bar" heading.
 */
export const LAYOUT_ROW = 'advanced.layoutShortcut'
export const LAYOUT_ROWS = [
  'advanced.toolNames',
  'advanced.formatTabs',
  'advanced.backToPen',
  'advanced.eraserMenus',
  'advanced.biggerLasso',
]

/** One of the five parts (not the Layout shortcut itself). */
export const isBarPartRow = (id: string): boolean => LAYOUT_ROWS.includes(id)

/** The short line under a row's name; follows the value. Undefined = use the setting's own text. */
export function barRowHelp(id: string, value: JsonValue): string | undefined {
  if (id === LAYOUT_ROW)
    return t(
      value === 'custom'
        ? 'settings.layoutShortcut.help.custom'
        : 'settings.layoutShortcut.help',
    )
  if (!isBarPartRow(id)) return undefined
  const key =
    id === 'advanced.formatTabs'
      ? `settings.formatTabs.help.${value === '4' ? '4' : '3'}`
      : `settings.${id.slice('advanced.'.length)}.help.${value === 'on' ? 'on' : 'off'}`
  return t(key as MessageKey)
}
