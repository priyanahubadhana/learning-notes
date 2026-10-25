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

/** Saves a preference; silently does nothing if storage is unavailable. */
export function writePref(
  key: string,
  value: unknown,
  storage: PrefStorage | null | undefined = defaultStorage(),
): void {
  try {
    storage?.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: preferences are optional.
  }
}

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean'

export const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'
