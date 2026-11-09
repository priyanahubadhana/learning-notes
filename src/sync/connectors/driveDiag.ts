/**
 * Drive-connection notes for the existing slow-moments log
 * (`learning-notes:perf.slow`, Settings › Advanced). Only plain facts such as
 * "no refresh token in the sign-in reply" or an HTTP status; never a token.
 * The last result is also kept in `learning-notes:sync.driveLast` for the
 * Settings › Sync status line.
 */
const LOG = 'learning-notes:perf.slow'
const LAST = 'learning-notes:sync.driveLast'

export function driveNote(note: string): void {
  try {
    const raw = localStorage.getItem(LOG)
    const list: unknown = raw ? JSON.parse(raw) : []
    const prev = Array.isArray(list) ? (list as object[]) : []
    const entry = { at: Date.now(), kind: 'drive', ms: 0, route: '', note }
    localStorage.setItem(LOG, JSON.stringify([...prev, entry].slice(-50)))
    localStorage.setItem(LAST, note)
  } catch {
    // Storage blocked: nothing kept.
  }
}

export function lastDriveNote(): string {
  try {
    return localStorage.getItem(LAST) ?? ''
  } catch {
    return ''
  }
}
