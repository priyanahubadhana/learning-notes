import { isOn, useFlag, type FlagId } from '../app/flags'

/**
 * Settings that only mean something when a feature switch is on. With the
 * switch off they are not listed (not in Settings, not in search) and change
 * nothing; their saved value is kept. Kept here, not on the setting itself,
 * so the settings file stays untouched.
 */
export const FLAG_GATED_SETTINGS: Readonly<Record<string, FlagId>> = {
  // The new top bar's Undo / Redo pair (slice 0h).
  'general.showUndoRedo': 'foundation.shell',
  // The v9 tool bar's Beginner / Professional parts (task 2A.14): no rows with the new bar off.
  'advanced.layoutShortcut': 'toolbar.v8',
  'advanced.toolNames': 'toolbar.v8',
  'advanced.formatTabs': 'toolbar.v8',
  'advanced.backToPen': 'toolbar.v8',
  'advanced.eraserMenus': 'toolbar.v8',
  'advanced.biggerLasso': 'toolbar.v8',
}

/** True when the setting is not gated, or its switch is on (reads the switch now). */
export const shownByFlags = (settingId: string): boolean => {
  const flag = FLAG_GATED_SETTINGS[settingId]
  return !flag || isOn(flag)
}

/** The same as `shownByFlags`, re-evaluated when the new-shell switch changes. */
export function useShownByFlags(): (settingId: string) => boolean {
  const shell = useFlag('foundation.shell')
  return (settingId) => {
    const flag = FLAG_GATED_SETTINGS[settingId]
    return !flag || (flag === 'foundation.shell' ? shell : isOn(flag))
  }
}
