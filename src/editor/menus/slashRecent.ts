/** The last items picked in the "/" menu, per device (PM-04). */
export const SLASH_RECENT_KEY = 'learning-notes:slash.recent'

export function readSlashRecent(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(SLASH_RECENT_KEY)
    const value: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string').slice(0, 3)
      : []
  } catch {
    return []
  }
}

export function writeSlashRecent(ids: readonly string[]): void {
  try {
    globalThis.localStorage?.setItem(
      SLASH_RECENT_KEY,
      JSON.stringify(ids.slice(0, 3)),
    )
  } catch {
    // Storage blocked or full: Recent still works until the page closes.
  }
}
