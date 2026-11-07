import { SyncCryptoError } from './crypto'
import { NeedsTapError, NotAllowedError, TryLaterError } from './connectors'
import type { SyncProblem } from './syncDisplay'

export { syncDisplay } from './syncDisplay'
export type { SyncDisplay, SyncProblem } from './syncDisplay'

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
