import { t } from '../../i18n/t'
import {
  readDeviceSetting,
  writeDeviceSetting,
} from '../../settings/settingsService'
import {
  readingBlanksSetting,
  readingRulerSetting,
} from '../../settings/readingSettings'
import { readingPanel, type ReadingPanelName } from './useReadingSettings'
import {
  isReading,
  readingLocked,
  startReading,
  stopReading,
} from './readingState'
import { getAppActions } from '../tools/toolRuntime'

/**
 * What the Reading tools do (View tab, Home › Font and Text size, the Read
 * set of the short bar and the control panel all call these).
 */

const toast = (key: Parameters<typeof t>[0]) => getAppActions()?.toast(t(key))

/** Turns Reading mode on in place if it is off (a tool needs it). */
function ensureReading(): void {
  if (!isReading()) startReading('inPlace')
}

/** The 📖 tool: Reading mode in place, or back. */
export function toggleReadingMode(): void {
  if (isReading()) exitReading()
  else startReading('inPlace')
}

/** The full-screen reader (like Kindle). */
export function openReader(): void {
  startReading('reader')
}

export function exitReading(): void {
  if (!stopReading()) toast('reading.lockedExit')
}

export function openReadingPanel(name: Exclude<ReadingPanelName, null>): void {
  ensureReading()
  readingPanel.set(readingPanel.get() === name ? null : name)
}

/** Line focus on or off (the last kind chosen is used again). */
export function toggleLineFocus(): void {
  const now = readDeviceSetting(readingRulerSetting)
  writeDeviceSetting(readingRulerSetting, now === 'off' ? 'focus' : 'off')
  ensureReading()
}

/** Self-test: hide the blanks, or show them softly marked. */
export function toggleHideBlanks(): void {
  const now = readDeviceSetting(readingBlanksSetting)
  writeDeviceSetting(readingBlanksSetting, now === 'hide' ? 'soft' : 'hide')
  ensureReading()
}

/** Lock to reading: stops editing until it is turned off. */
export function toggleLockToReading(): void {
  ensureReading()
  readingLocked.set(!readingLocked.get())
}
