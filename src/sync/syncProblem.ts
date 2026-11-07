import { SyncCryptoError } from './crypto'
import { NeedsTapError, NotAllowedError, TryLaterError } from './connectors'
import type { SyncPhase } from './syncService'

/**
 * What went wrong, in a few plain words (polish 1, item 12). The connectors
 * throw technical errors (a server code, a token message); the person only
 * ever sees one of these, never the raw text and never a token.
 */
export type SyncProblem =
  | 'signInAgain' // the session ended: sign in again
  | 'notAllowed' // a Google account that may not sync
  | 'driveFull' // Google Drive has no room
  | 'offline' // no connection
  | 'busy' // the server is busy: tries again by itself
  | 'needCode' // the key cannot open the data: the recovery code is needed
  | 'unreadable'
  | 'clock'
  | 'failed'

/** Maps any error from a sync run to one of the plain problems. */
export function mapSyncError(e: unknown): SyncProblem {
  if (e instanceof SyncCryptoError) return 'needCode'
  if (e instanceof NotAllowedError) {
    return /signed out|session ended/.test(e.message)
      ? 'signInAgain'
      : 'notAllowed'
  }
  if (e instanceof NeedsTapError) return 'failed' // shown by its own button
  if (e instanceof TryLaterError) {
    if (/drive full/.test(e.message)) return 'driveFull'
    if (/\b(429|5\d\d)\b/.test(e.message)) return 'busy'
    return 'offline'
  }
  return 'failed'
}

/** The steady state shown by the dot. */
export type SyncDisplay = 'synced' | 'syncing' | 'offline' | 'attention'

/**
 * Synced, Syncing, Offline or Needs attention; null when Sync is not set up
 * on this device (no dot at all).
 */
export function syncDisplay(
  status: {
    phase: SyncPhase
    problem?: SyncProblem
    needsDriveTap?: boolean
  },
  online: boolean,
): SyncDisplay | null {
  if (status.phase === 'signedOut') return null
  if (status.phase === 'syncing') return 'syncing'
  if (status.phase === 'needsSetup' || status.phase === 'needsKey') {
    return 'attention'
  }
  if (!online || status.problem === 'offline') return 'offline'
  if (status.problem || status.needsDriveTap) return 'attention'
  return 'synced'
}
