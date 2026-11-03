import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  barButtonPx,
  DEFAULT_PINNED,
  detectDeviceMode,
  hasHardwareKeyboard,
  isDeviceMode,
  isPinnedList,
  subscribeHardwareKeyboard,
  watchHardwareKeyboard,
  type BarPlacement,
  type BarSize,
  type DeviceMode,
} from '../app/deviceMode'
import { isBoolean, readPref, writePref } from '../app/uiPrefs'
import { t } from '../i18n/t'
import {
  applyDeviceMode,
  applyModePreset,
  barAutoHideSetting,
  barPlacementSetting,
  barSizeSetting,
  deviceModeSetting,
  hoverTipsSetting,
  shortcutHintsSetting,
} from './builtinSettings'
import { useDeviceSetting } from './useSetting'

/**
 * Device modes at run time: first-run pick, hooks that give the formatting
 * bar its settings, the saved list of bar buttons, and the one-time offer
 * of Pencil mode. The settings themselves are in builtinSettings.ts.
 */

/** Runs once at start: picks a mode from the device on first run. */
export function initDeviceMode(): void {
  watchHardwareKeyboard()
  const stored = readPref<DeviceMode | null>(
    deviceModeSetting.id,
    (v): v is DeviceMode | null => v === null || isDeviceMode(v),
    null,
  )
  if (stored === null) applyDeviceMode(detectDeviceMode())
}

export interface BarSettings {
  mode: DeviceMode
  placement: BarPlacement
  size: BarSize
  /** Height of one button in px (never under finger size in Touch/Pencil). */
  buttonPx: number
  hoverTips: boolean
  /** On, or a real keyboard was used (even in Touch mode). */
  shortcutHints: boolean
  autoHide: boolean
}

export function useBarSettings(): BarSettings {
  const [mode] = useDeviceSetting(deviceModeSetting)
  const [placement] = useDeviceSetting(barPlacementSetting)
  const [size] = useDeviceSetting(barSizeSetting)
  const [hoverTips] = useDeviceSetting(hoverTipsSetting)
  const [hints] = useDeviceSetting(shortcutHintsSetting)
  const [autoHide] = useDeviceSetting(barAutoHideSetting)
  const keyboard = useSyncExternalStore(
    subscribeHardwareKeyboard,
    hasHardwareKeyboard,
  )
  return {
    mode,
    placement,
    size,
    buttonPx: barButtonPx(size, mode),
    hoverTips: hoverTips === 'on',
    shortcutHints: hints === 'on' || keyboard,
    autoHide: autoHide === 'on',
  }
}

/** Back to the current mode's preset (the Edit bar's Reset). */
export const resetBarSettings = (mode: DeviceMode) => applyModePreset(mode)

// ---- Which buttons are on the bar (per device) ----

const PINNED_KEY = 'formatBar.pinned'
let pinned: readonly string[] | undefined
const pinnedListeners = new Set<() => void>()

export function readPinned(): readonly string[] {
  pinned ??= readPref(PINNED_KEY, isPinnedList, [...DEFAULT_PINNED])
  return pinned
}

export function writePinned(list: readonly string[]): void {
  if (!isPinnedList(list)) throw new Error('Invalid bar buttons')
  pinned = [...list]
  writePref(PINNED_KEY, pinned)
  for (const listener of pinnedListeners) listener()
}

/** Tests only. */
export const clearPinnedCache = () => {
  pinned = undefined
}

export function usePinned(): readonly string[] {
  return useSyncExternalStore((listener) => {
    pinnedListeners.add(listener)
    return () => {
      pinnedListeners.delete(listener)
    }
  }, readPinned)
}

// ---- On-screen keyboard ----

const keyboardInset = () => {
  const vv = typeof window === 'undefined' ? null : window.visualViewport
  return vv
    ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
    : 0
}

function subscribeViewport(listener: () => void) {
  const vv = window.visualViewport
  vv?.addEventListener('resize', listener)
  vv?.addEventListener('scroll', listener)
  return () => {
    vv?.removeEventListener('resize', listener)
    vv?.removeEventListener('scroll', listener)
  }
}

/** Pixels the on-screen keyboard covers at the bottom (0 without one). */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribeViewport, keyboardInset)
}

// ---- Offer Pencil mode once ----

const PEN_OFFERED_KEY = 'penOffered'

/**
 * When a Pencil touches the screen for the first time on a device that is
 * not in Pencil mode, offers the switch once in a small message. The mode
 * never changes without a tap on the offer.
 */
export function useOfferPencilMode(
  toast: (
    message: string,
    action?: { label: string; onSelect: () => void },
  ) => void,
): void {
  const [mode] = useDeviceSetting(deviceModeSetting)
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  })
  useEffect(() => {
    if (mode === 'pencil' || readPref(PEN_OFFERED_KEY, isBoolean, false)) return
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'pen') return
      writePref(PEN_OFFERED_KEY, true)
      window.removeEventListener('pointerdown', onDown, true)
      toastRef.current(t('mode.penOffer'), {
        label: t('mode.switchToPencil'),
        onSelect: () => applyDeviceMode('pencil'),
      })
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [mode])
}
