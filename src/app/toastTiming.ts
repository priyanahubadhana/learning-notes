/** Shortest and longest time a message stays (milliseconds). */
const MIN_MS = 2500
const MAX_MS = 8000
/** A message with a button (e.g. Undo) stays at least this long. */
const WITH_ACTION_MS = 6000
/** After hovering or tapping ends, the message waits this long before closing. */
export const TOAST_AFTER_HOLD_MS = 1500

/** How long a toast stays: short messages ≈ 2.5 s, longer ones more, up to 8 s. */
export function toastDuration(message: string, hasAction: boolean): number {
  const byLength = Math.min(
    MAX_MS,
    Math.max(MIN_MS, 1800 + [...message].length * 45),
  )
  return hasAction ? Math.max(WITH_ACTION_MS, byLength) : byLength
}

/** Height of the on-screen keyboard's own bar that sits above the keys. */
export const KEYBOARD_BAR_PX = 44
/** B3-11: where a toast's bottom edge goes: above the keyboard and its bar. */
export function toastBottom(keyboardInset: number): number | undefined {
  return keyboardInset > 40 ? keyboardInset + KEYBOARD_BAR_PX + 12 : undefined
}
