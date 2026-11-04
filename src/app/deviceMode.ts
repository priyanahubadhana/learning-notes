/**
 * Device modes: Computer, Touch and Pencil. Each mode is a preset of the
 * per-device formatting-bar settings (where the bar sits, how big its
 * buttons are, hover tips, shortcut hints, auto-hide). The settings can
 * then be changed one by one (Settings › Advanced). Pure logic only; the
 * settings that store these values are in settings/builtinSettings.ts.
 */

export const DEVICE_MODES = ['computer', 'touch', 'pencil'] as const
export type DeviceMode = (typeof DEVICE_MODES)[number]

/**
 * top and bottom dock the bar; free is a bar that floats over the page (drag
 * it by its handle); floating (the older name) means the bar is turned off
 * (only the toolbar over selected text); no mode's preset uses it.
 */
export const BAR_PLACEMENTS = ['top', 'bottom', 'free', 'floating'] as const
export type BarPlacement = (typeof BAR_PLACEMENTS)[number]

export const BAR_SIZES = ['compact', 'normal', 'large'] as const
export type BarSize = (typeof BAR_SIZES)[number]

export type OnOff = 'on' | 'off'

export const isDeviceMode = (v: unknown): v is DeviceMode =>
  (DEVICE_MODES as readonly unknown[]).includes(v)
export const isBarPlacement = (v: unknown): v is BarPlacement =>
  (BAR_PLACEMENTS as readonly unknown[]).includes(v)
export const isBarSize = (v: unknown): v is BarSize =>
  (BAR_SIZES as readonly unknown[]).includes(v)
export const isOnOff = (v: unknown): v is OnOff => v === 'on' || v === 'off'

export interface ModePreset {
  placement: BarPlacement
  size: BarSize
  hoverTips: OnOff
  shortcutHints: OnOff
  autoHide: OnOff
}

export const MODE_PRESETS: Record<DeviceMode, ModePreset> = {
  computer: {
    placement: 'top',
    size: 'compact',
    hoverTips: 'on',
    shortcutHints: 'on',
    autoHide: 'off',
  },
  touch: {
    placement: 'top',
    size: 'normal',
    hoverTips: 'off',
    shortcutHints: 'off',
    autoHide: 'off',
  },
  pencil: {
    placement: 'top',
    size: 'large',
    hoverTips: 'off',
    shortcutHints: 'off',
    autoHide: 'off',
  },
}

/** Height of a bar button in px for each size. */
export const BAR_SIZE_PX: Record<BarSize, number> = {
  compact: 36,
  normal: 44,
  large: 54,
}

/** Smallest comfortable touch target (px). */
export const MIN_TOUCH_PX = 44

/**
 * Button height in px. Touch and Pencil never go below a finger-sized
 * target, even when "Compact" is chosen.
 */
export function barButtonPx(size: BarSize, mode: DeviceMode): number {
  const px = BAR_SIZE_PX[size]
  return mode === 'computer' ? px : Math.max(px, MIN_TOUCH_PX)
}

/** Touch facts the browser gives (injectable for tests). */
export interface TouchHints {
  maxTouchPoints: number
  platform: string
}

const browserTouch = (): TouchHints => ({
  maxTouchPoints:
    typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
  platform: typeof navigator === 'undefined' ? '' : navigator.platform,
})

/** An iPad that Safari presents as a Mac: a "Mac" with a touch screen. */
export const isIpadAsMac = (touch: TouchHints = browserTouch()): boolean =>
  touch.platform === 'MacIntel' && touch.maxTouchPoints > 1

/**
 * What the device suggests on first run (never picks Pencil). An iPad in
 * "desktop website" mode (Safari's default) claims a fine pointer with hover
 * and calls itself a Mac, so it is recognised as "a Mac with a touch screen"
 * and gets Touch, not Computer.
 */
export function detectDeviceMode(
  matches: (query: string) => boolean = (q) =>
    typeof window !== 'undefined' && !!window.matchMedia?.(q).matches,
  touch: TouchHints = browserTouch(),
): DeviceMode {
  if (isIpadAsMac(touch)) return 'touch'
  if (matches('(pointer: fine) and (hover: hover)')) return 'computer'
  if (matches('(pointer: coarse)')) return 'touch'
  return 'computer'
}

// ---- Switching by itself when a Pencil or a finger is used ----

export const AUTO_SWITCHES = ['pen', 'both', 'off'] as const
/** pen = only a Pencil switches; both = a finger switches back; off. */
export type AutoSwitch = (typeof AUTO_SWITCHES)[number]
export const isAutoSwitch = (v: unknown): v is AutoSwitch =>
  (AUTO_SWITCHES as readonly unknown[]).includes(v)

/** After a switch, the other input must stay quiet this long (ms). */
export const AUTO_SWITCH_QUIET_MS = 1500

/**
 * The mode a pointer asks for, or null for "stay". A pen asks for Pencil
 * (unless already there); with "both ways" a finger asks for Touch, but only
 * from Pencil mode. A mouse never switches anything.
 */
export function autoSwitchTarget(
  mode: DeviceMode,
  pointerType: string,
  setting: AutoSwitch,
): DeviceMode | null {
  if (setting === 'off') return null
  if (pointerType === 'pen') return mode === 'pencil' ? null : 'pencil'
  if (pointerType === 'touch' && setting === 'both' && mode === 'pencil') {
    return 'touch'
  }
  return null
}

// ---- Which buttons are on the bar ----

/** Revise mark buttons are `mark:<label id>`. */
export const markActionId = (label: string) => `mark:${label}`

/** The Write set's tools from the start (batch 2d). */
export const DEFAULT_PINNED: readonly string[] = [
  'undo',
  'redo',
  'bold',
  'italic',
  'color',
  'highlight',
  'bulletList',
  'checklist',
  'picture',
  'more',
  'newLine',
]

const ACTION_ID = /^[a-zA-Z][a-zA-Z0-9:-]{0,60}$/
export const MAX_PINNED = 40

/** True for a stored list of button ids: unique, short, plain. */
export function isPinnedList(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length > MAX_PINNED) return false
  const seen = new Set<string>()
  for (const id of value) {
    if (typeof id !== 'string' || !ACTION_ID.test(id) || seen.has(id)) {
      return false
    }
    seen.add(id)
  }
  return true
}

/** Keeps only buttons that still exist (a deleted Revise label drops out). */
export const keepKnown = (list: readonly string[], known: readonly string[]) =>
  list.filter((id) => known.includes(id))

/** Adds a button at the end (nothing changes if it is there already). */
export const pinAction = (list: readonly string[], id: string): string[] =>
  list.includes(id) || list.length >= MAX_PINNED ? [...list] : [...list, id]

export const unpinAction = (list: readonly string[], id: string): string[] =>
  list.filter((x) => x !== id)

/** Moves a button `delta` places (negative = earlier); stays inside the list. */
export function moveAction(
  list: readonly string[],
  id: string,
  delta: number,
): string[] {
  const from = list.indexOf(id)
  if (from < 0) return [...list]
  const to = Math.min(list.length - 1, Math.max(0, from + delta))
  const next = [...list]
  next.splice(from, 1)
  next.splice(to, 0, id)
  return next
}

// ---- A real keyboard is attached ----

/**
 * True for key presses a phone or iPad on-screen keyboard cannot make
 * (shortcuts with Ctrl/Cmd/Alt, arrows, Tab, Esc, function keys).
 */
export function isHardwareKey(e: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true
  return /^(Arrow(Up|Down|Left|Right)|Tab|Escape|F\d{1,2}|Home|End|PageUp|PageDown)$/.test(
    e.key,
  )
}

let hardwareKeyboard = false
const keyboardListeners = new Set<() => void>()

export const hasHardwareKeyboard = () => hardwareKeyboard
export function subscribeHardwareKeyboard(listener: () => void) {
  keyboardListeners.add(listener)
  return () => {
    keyboardListeners.delete(listener)
  }
}

/** Starts watching for a physical keyboard (once per page). */
export function watchHardwareKeyboard(target: EventTarget = window): void {
  const onKey = (e: Event) => {
    if (!isHardwareKey(e as KeyboardEvent) || hardwareKeyboard) return
    hardwareKeyboard = true
    target.removeEventListener('keydown', onKey, true)
    for (const listener of keyboardListeners) listener()
  }
  target.addEventListener('keydown', onKey, true)
}

/** Tests only. */
export const resetHardwareKeyboard = () => {
  hardwareKeyboard = false
}
