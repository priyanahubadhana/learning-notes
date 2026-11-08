import { getSyncStatus, subscribeSync } from '../../sync/syncStatus'
import { trackFailures } from './attentionLevel'

/**
 * The non-sync facts the alerts banner reads (update waiting, storage,
 * backups). Set by the parts of the app that know them; read by the gate.
 */
export interface AttentionSignals {
  updateReady: boolean
  /** Restarts into the new version. */
  applyUpdate: (() => void) | null
  updateNeeded: boolean
  storageHigh: boolean
  backupFailures: number
  /** Failed syncs in a row. */
  failStreak: number
}

let value: AttentionSignals = {
  updateReady: false,
  applyUpdate: null,
  updateNeeded: false,
  storageHigh: false,
  backupFailures: 0,
  failStreak: 0,
}
const listeners = new Set<() => void>()

export const getSignals = () => value
export function setSignals(next: Partial<AttentionSignals>) {
  value = { ...value, ...next }
  for (const l of listeners) l()
}
export function subscribeSignals(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const BACKUP_KEY = 'attn.backupFails'

/** Remembers failed silent backups across starts (2 in a row = a banner). */
export function noteBackup(ok: boolean): void {
  let count = ok ? 0 : value.backupFailures + 1
  try {
    count = ok ? 0 : Number(localStorage.getItem(BACKUP_KEY) ?? 0) + 1
    localStorage.setItem(BACKUP_KEY, String(count))
  } catch {
    // Blocked: the count lives for this start only.
  }
  setSignals({ backupFailures: count })
}

export function loadBackupFailures(): void {
  try {
    setSignals({
      backupFailures: Number(localStorage.getItem(BACKUP_KEY) ?? 0),
    })
  } catch {
    // Blocked: no banner for backups.
  }
}

/** Over 90% of the browser storage quota used. */
export async function checkStorage(): Promise<void> {
  try {
    const e = await navigator.storage?.estimate?.()
    if (e?.quota && e.usage !== undefined) {
      setSignals({ storageHigh: e.usage / e.quota > 0.9 })
    }
  } catch {
    // Unknown: stay quiet.
  }
}

/** Counts failed syncs in a row from the sync status; returns stop. */
export function watchFailures(): () => void {
  let track = { count: 0, since: 0 }
  return subscribeSync(() => {
    track = trackFailures(
      track,
      getSyncStatus().problem === 'failed',
      Date.now(),
    )
    if (track.count !== value.failStreak)
      setSignals({ failStreak: track.count })
  })
}
