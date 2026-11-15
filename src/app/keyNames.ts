import { deviceModeSetting } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'
import { useDeviceSetting } from '../settings/useSetting'
import type { DeviceMode } from './deviceMode'

/**
 * T31: key names ("⌘⇧K", "Ctrl+B") show only in Computer mode (keyboard or
 * mouse). On Touch and Pencil nothing shows them, in any menu, tip or list.
 * Every place that would show a shortcut label goes through here.
 */
export const keyNamesShown = (mode: DeviceMode): boolean => mode === 'computer'

/** `label` in Computer mode, otherwise nothing. */
export const keyNameFor = (
  mode: DeviceMode,
  label: string | undefined,
): string | undefined => (keyNamesShown(mode) ? label : undefined)

/** For code that is not a component (reads the device's current mode). */
export const keyName = (label: string | undefined): string | undefined =>
  keyNameFor(readDeviceSetting(deviceModeSetting), label)

/** For components: re-renders when the mode changes. */
export function useKeyName(): (
  label: string | undefined,
) => string | undefined {
  const [mode] = useDeviceSetting(deviceModeSetting)
  return (label) => keyNameFor(mode, label)
}
