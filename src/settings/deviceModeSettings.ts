import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  AUTO_SWITCH_QUIET_MS,
  autoSwitchTarget,
  barButtonPx,
  MODE_PRESETS,
  DEFAULT_PINNED,
  detectDeviceMode,
  isIpadAsMac,
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
  autoSwitchSetting,
  barAutoHideSetting,
  barPlacementSetting,
  barSizeSetting,
  deviceModeSetting,
  hoverTipsSetting,
  shortcutHintsSetting,
} from './builtinSettings'
import { readDeviceSetting } from './settingsService'
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
  if (stored === null) {
    applyDeviceMode(detectDeviceMode())
    writePref(RECHECKED_KEY, true)
    return
  }
  recheckDetection(stored)
}

const RECHECKED_KEY = 'modeRechecked'

/**
 * One-time repair (batch 2c): an iPad that Safari presented as a Mac was
 * given Computer mode by the first-run pick. If this device is still on the
 * untouched Computer preset and is now recognised as touch, move it to Touch.
 * A mode or bar the owner changed is never touched.
 */
function recheckDetection(stored: DeviceMode): void {
  if (readPref(RECHECKED_KEY, isBoolean, false)) return
  writePref(RECHECKED_KEY, true)
  if (stored !== 'computer' || !isIpadAsMac()) return
  const preset = MODE_PRESETS.computer
  const untouched =
    readDeviceSetting(barPlacementSetting) === preset.placement &&
    readDeviceSetting(barSizeSetting) === preset.size &&
    readDeviceSetting(hoverTipsSetting) === preset.hoverTips &&
    readDeviceSetting(shortcutHintsSetting) === preset.shortcutHints &&
    readDeviceSetting(barAutoHideSetting) === preset.autoHide
  if (untouched) applyDeviceMode('touch')
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

// ---- Switching by itself when a Pencil or a finger is used ----

/**
 * "Auto switch" (Settings › Advanced). A Pencil on the screen switches to
 * Pencil mode (a message with Undo); with "Both ways" a finger switches back
 * to Touch. Never mid-gesture or while typing: a switch waits until no
 * pointer is down and the last key press was over a moment ago, and a switch
 * is followed by a quiet time so the two never flip back and forth.
 */
export function useAutoDeviceMode(
  toast: (
    message: string,
    action?: { label: string; onSelect: () => void },
  ) => void,
): void {
  const [mode] = useDeviceSetting(deviceModeSetting)
  const [setting] = useDeviceSetting(autoSwitchSetting)
  const toastRef = useRef(toast)
  const modeRef = useRef(mode)
  useEffect(() => {
    toastRef.current = toast
    modeRef.current = mode
  })
  useEffect(() => {
    if (setting === 'off') return
    let quietUntil = 0
    let lastKey = 0
    let down = 0
    const onKey = () => {
      lastKey = Date.now()
    }
    const onUp = () => {
      down = Math.max(0, down - 1)
    }
    const onDown = (e: PointerEvent) => {
      down++
      const now = Date.now()
      const target = autoSwitchTarget(modeRef.current, e.pointerType, setting)
      // Pen and finger both count while a gesture is going on.
      if (!target || now < quietUntil || down > 1) return
      // Not while typing with a keyboard.
      if (now - lastKey < AUTO_SWITCH_QUIET_MS) return
      const before = modeRef.current
      quietUntil = now + AUTO_SWITCH_QUIET_MS
      applyDeviceMode(target)
      toastRef.current(t('mode.autoSwitched', { mode: t(`mode.${target}`) }), {
        label: t('mode.undo'),
        onSelect: () => {
          quietUntil = Date.now() + AUTO_SWITCH_QUIET_MS
          applyDeviceMode(before)
        },
      })
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onUp, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [setting])
}
