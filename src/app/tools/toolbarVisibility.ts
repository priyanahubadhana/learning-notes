import { isBoolean, readPref, writePref } from '../uiPrefs'
import { t } from '../../i18n/t'
import { barPlacementSetting } from '../../settings/builtinSettings'
import {
  readDeviceSetting,
  writeDeviceSetting,
} from '../../settings/settingsService'
import { useDeviceSetting } from '../../settings/useSetting'
import { isBarPlacement, type BarPlacement } from '../deviceMode'
import { prefStore } from './store'
import { getAppActions } from './toolRuntime'

/**
 * Turning the tool bar on and off. "Off" is the placement `floating` (no bar,
 * only BlockNote's toolbar over selected text). Turning it off asks first and
 * says where to turn it back on; afterwards a message offers Undo. While it is
 * off a small "Show tool bar" button stays in the top bar, so the bar can
 * never end up hidden with no way back.
 */

type Docked = Exclude<BarPlacement, 'floating'>
const isDocked = (v: unknown): v is Docked =>
  isBarPlacement(v) && v !== 'floating'

/** Where the bar sat before it was turned off (it comes back there). */
const lastPlacement = prefStore<Docked>(
  'toolbar.lastPlacement',
  isDocked,
  'top',
)
/** The user turned it off (so Computer mode shows the way back too). */
const turnedOff = prefStore('toolbar.turnedOff', isBoolean, false)

export const isToolBarOn = (): boolean =>
  readDeviceSetting(barPlacementSetting) !== 'floating'

/** Turns the bar on, where it sat last (Top at first). */
export function showToolBar(): void {
  writeDeviceSetting(barPlacementSetting, lastPlacement.get())
  turnedOff.set(false)
}

/** Turns it off at once (no question): used by Undo-free paths and tests. */
export function hideToolBar(): void {
  const now = readDeviceSetting(barPlacementSetting)
  if (now !== 'floating') lastPlacement.set(now)
  turnedOff.set(true)
  writeDeviceSetting(barPlacementSetting, 'floating')
}

/**
 * Asks before turning the bar off, then offers Undo. Resolves to true if it
 * was turned off. Without an open app (tests) it does nothing.
 */
export async function requestHideToolBar(): Promise<boolean> {
  const app = getAppActions()
  if (!app || !isToolBarOn()) return false
  const answer = await app.choose({
    title: t('toolbar.off.title'),
    message: t('toolbar.off.message'),
    options: [
      { value: 'cancel', label: t('dialog.cancel'), primary: true },
      { value: 'off', label: t('toolbar.off.confirm') },
    ],
  })
  if (answer !== 'off') return false
  hideToolBar()
  app.toast(t('toolbar.off.done'), {
    label: t('mode.undo'),
    onSelect: showToolBar,
  })
  return true
}

/** Toggles the bar (the ribbon tool, the page ⋯ menu). */
export function toggleToolBar(): void {
  if (isToolBarOn()) void requestHideToolBar()
  else showToolBar()
}

/**
 * The "Show tool bar" button shows whenever no bar is drawn (placement
 * `floating`), in every mode, so the bar can never be lost.
 */
export const showBarButtonFor = (placement: BarPlacement): boolean =>
  placement === 'floating'

export function useShowBarButton(): boolean {
  const [placement] = useDeviceSetting(barPlacementSetting)
  return showBarButtonFor(placement)
}

/**
 * One-time repair (batch 2f): Computer mode used to mean "no bar". A device
 * saved with placement `floating` that the user never turned off gets the
 * short bar at the top. Only an explicit "turn off" leaves the bar off.
 */
const MIGRATED_KEY = 'toolbar.offMigrated'
export function migrateBarOff(): void {
  if (readPref(MIGRATED_KEY, isBoolean, false)) return
  writePref(MIGRATED_KEY, true)
  if (
    readDeviceSetting(barPlacementSetting) === 'floating' &&
    !turnedOff.get()
  ) {
    writeDeviceSetting(barPlacementSetting, 'top')
  }
}

/** Tests only. */
export function resetToolbarVisibility(): void {
  lastPlacement.clearCache()
  turnedOff.clearCache()
}
