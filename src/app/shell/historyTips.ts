import type { DeviceMode } from '../deviceMode'

const isMac = (): boolean =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** "Undo (Ctrl Z)", "Redo (Ctrl Y)"; on a Mac "Cmd Z" and "Cmd Shift Z". */
export function historyTip(
  kind: 'undo' | 'redo',
  word: string,
  mac: boolean = isMac(),
): string {
  const key = mac ? 'Cmd' : 'Ctrl'
  if (kind === 'undo') return `${word} (${key} Z)`
  return `${word} (${mac ? 'Cmd Shift Z' : 'Ctrl Y'})`
}

/** SH-05: the pair hides only on a computer, and only when the setting is off. */
export const showHistoryPair = (
  mode: DeviceMode,
  setting: 'on' | 'off',
): boolean => mode !== 'computer' || setting === 'on'
