import { t, type MessageKey } from '../i18n/t'
import { DEVICE_MODES, type DeviceMode } from './deviceMode'
import { applyDeviceMode } from '../settings/builtinSettings'
import type { IconName } from './tools/icons'
import type { MenuItem } from './ui'

/**
 * The three device modes as menu rows (top bar button and page ⋯ menu): each
 * has a one-line description and a tick on the current one.
 */

export const MODE_ICON: Record<DeviceMode, IconName> = {
  computer: 'monitor',
  touch: 'hand',
  pencil: 'pencil',
}

const MODE_EMOJI: Record<DeviceMode, string> = {
  computer: '🖥',
  touch: '✋',
  pencil: '✏️',
}

/** The three modes as menu rows, the current one ticked. */
export function deviceModeChoices(current: DeviceMode): MenuItem[] {
  return DEVICE_MODES.map((mode) => ({
    label: t(`mode.${mode}` as MessageKey),
    description: t(`mode.desc.${mode}` as MessageKey),
    icon: MODE_EMOJI[mode],
    checked: mode === current,
    onSelect: () => applyDeviceMode(mode),
  }))
}

/** The page ⋯ menu item that opens the list. */
export function deviceModeItem(current: DeviceMode): MenuItem {
  return {
    label: t('mode.menu'),
    icon: MODE_EMOJI[current],
    submenu: deviceModeChoices(current),
    onSelect: () => {},
  }
}
