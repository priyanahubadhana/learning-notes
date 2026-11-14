import { useSyncExternalStore } from 'react'
import { isPreviewHost } from '../../app/flags'
import type { JsonValue } from '../../core/types'

/**
 * SET-B26: "Try new features" stays hidden until someone opens it (Version
 * tapped 5 times, or the phrase typed in search). It stays open for this
 * visit only: it is kept in session storage, not on the device for good.
 */
export const TRY_NEW_KEY = 'learning-notes:v3.tryNew'
/** The new Settings screen's own switch: Turn all off never touches it. */
export const KEEP_ON_ID = 'tryNew.settings.v3'
export const TAPS_NEEDED = 5
/** The taps must come within this time of each other. */
export const TAP_WINDOW_MS = 3000

const listeners = new Set<() => void>()
// F9: on the preview host testers always see the list, so search finds every switch.
let open = (() => {
  if (isPreviewHost()) return true
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

/** The Try new features rows that Turn all off switches off (everything on except the new Settings). */
export function rowsToTurnOff<T extends { id: string; category: string }>(
  rows: readonly T[],
  isOn: (row: T) => boolean,
): T[] {
  return rows.filter(
    (s) =>
      s.category === 'tryNew' &&
      s.id !== KEEP_ON_ID &&
      !s.id.startsWith('tryNewPreset.') &&
      isOn(s),
  )
}

/**
 * The Undo step of a Test a phase change: one item per switch that changed,
 * so Undo gives back the exact earlier list of switches (not just Off).
 * A change that moved no switch (choosing a phase while Off) keeps its own item.
 */
export function presetChangeItems(
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  own: { id: string; before: JsonValue; after: JsonValue },
): { id: string; before: JsonValue; after: JsonValue }[] {
  const ids = [...new Set([...before, ...after])].filter(
    (f) => before.has(f) !== after.has(f),
  )
  const items = ids.map((f) => ({
    id: `tryNew.${f}`,
    before: (before.has(f) ? 'on' : 'off') as JsonValue,
    after: (after.has(f) ? 'on' : 'off') as JsonValue,
  }))
  return ids.length === 0 ? [own] : items
}

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
