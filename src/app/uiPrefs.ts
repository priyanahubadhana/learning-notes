/**
 * Small per-device display preferences (open page, expanded tree items,
 * theme). These are conveniences, not notes data, so they live in
 * localStorage. Storage can be missing or blocked (private mode, browser
 * settings): reads then fall back to defaults and writes are skipped.
 */

const PREFIX = 'learning-notes:'

/** The parts of the Web Storage API we use (easy to fake in tests). */
export type PrefStorage = Pick<Storage, 'getItem' | 'setItem'>

/** localStorage if usable, else undefined (accessing it can throw). */
function defaultStorage(): PrefStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** Reads a preference; returns `fallback` if missing, invalid or unreadable. */
export function readPref<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
  storage: PrefStorage | null | undefined = defaultStorage(),
): T {
  try {
    const raw = storage?.getItem(PREFIX + key)
    if (raw == null) return fallback
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

/** Calls the hook after a preference is saved in this browser (settings that follow you). */
let writeHook: ((key: string, value: unknown) => void) | null = null
export function setPrefWriteHook(
  fn: ((key: string, value: unknown) => void) | null,
): void {
  writeHook = fn
}

/** Tells open screens a preference changed because of sync, not a click. */
const externalListeners = new Set<(key: string, value: unknown) => void>()
export function onPrefChangedExternally(
  fn: (key: string, value: unknown) => void,
): () => void {
  externalListeners.add(fn)
  return () => externalListeners.delete(fn)
}
export function announcePrefChanged(key: string, value: unknown): void {
  for (const l of externalListeners) l(key, value)
}

/** Saves a preference; silently does nothing if storage is unavailable. */
export function writePref(
  key: string,
  value: unknown,
  storage?: PrefStorage | null,
): void {
  try {
    const target = storage === undefined ? defaultStorage() : storage
    target?.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: preferences are optional.
  }
  // Only the browser's own storage can follow the person to other devices.
  if (storage === undefined) writeHook?.(key, value)
}

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean'

export const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

export const isNumberList = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.every((v) => typeof v === 'number' && Number.isFinite(v))
