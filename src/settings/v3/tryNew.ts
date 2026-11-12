import { useSyncExternalStore } from 'react'

/**
 * SET-B26: "Try new features" stays hidden until someone opens it (Version
 * tapped 5 times, or the phrase typed in search). It stays open for this
 * visit only: it is kept in session storage, not on the device for good.
 */
export const TRY_NEW_KEY = 'learning-notes:v3.tryNew'
export const TAPS_NEEDED = 5
/** The taps must come within this time of each other. */
export const TAP_WINDOW_MS = 3000

const listeners = new Set<() => void>()
let open = (() => {
  try {
    return globalThis.sessionStorage?.getItem(TRY_NEW_KEY) === '1'
  } catch {
    return false
  }
})()

export const tryNewOpen = (): boolean => open

export function openTryNew(): void {
  if (open) return
  open = true
  try {
    globalThis.sessionStorage?.setItem(TRY_NEW_KEY, '1')
  } catch {
    // Blocked storage: it stays open until the page closes.
  }
  for (const l of listeners) l()
}

/** Tests: shut it again. */
export function closeTryNew(): void {
  open = false
  try {
    globalThis.sessionStorage?.removeItem(TRY_NEW_KEY)
  } catch {
    // ignore
  }
  for (const l of listeners) l()
}

export const useTryNewOpen = (): boolean =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    tryNewOpen,
    () => false,
  )

/** Does the search text ask for the hidden list? */
export const asksForTryNew = (query: string): boolean =>
  /\btry\s+new\s+features?\b/i.test(query)

/** Counts taps: true on the fifth within the window. Pure, so it is tested. */
export function createTapCounter(
  needed = TAPS_NEEDED,
  windowMs = TAP_WINDOW_MS,
) {
  let taps: number[] = []
  return (now: number): boolean => {
    taps = [...taps.filter((t) => now - t <= windowMs), now]
    if (taps.length >= needed) {
      taps = []
      return true
    }
    return false
  }
}
