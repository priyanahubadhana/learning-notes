import type { SyncProblem } from './syncDisplay'

/**
 * The sync status the screens read (dot, label, Settings). Kept apart from
 * `syncService` so the first download holds only this small store, not the
 * whole sync engine (which loads a moment after start).
 */

export type SyncPhase =
  | 'signedOut'
  | 'needsSetup' // signed in, no key anywhere yet: make one
  | 'needsKey' // signed in, a key exists: type the passphrase or code
  | 'ready'
  | 'syncing'

/** Counts shown when this device and the cloud both changed (after a remote sign-out). */
export interface SyncChoiceCounts {
  pagesHere: number
  pagesThere: number
  itemsHere: number
  itemsThere: number
}

export interface SyncStatus {
  phase: SyncPhase
  email?: string
  /** Google profile picture (https), if any. */
  avatar?: string
  lastSyncedAt?: number
  /** Short reason of the last failure (not shown as is: mapped to text). */
  problem?: SyncProblem
  needsDriveTap?: boolean
  mergedPages?: number
  /** The live feed is open: other devices' saves arrive within a second. */
  live?: boolean
  /** The server ended this device's session: the lock screen shows until sign-in. */
  endedRemotely?: boolean
  /** Signed back in with unsent changes here: the person chooses how to join. */
  choice?: SyncChoiceCounts
  /** Just unlocked: the first download is running (notes so far) or done. */
  arrival?: { done: number; finished: boolean }
}

let status: SyncStatus = { phase: 'signedOut' }
const listeners = new Set<() => void>()

export function setSyncStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next }
  for (const l of listeners) l()
}

export const getSyncStatus = () => status
export function subscribeSync(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
