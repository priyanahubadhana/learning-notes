import type { MergeMode } from './tables'

/**
 * Merge rules (L7), as pure functions so they are easy to test. A pulled
 * record is compared with this device's copy:
 *
 * 1. Nothing here yet → take it.
 * 2. "Delete forever" always wins (a purged copy beats an unpurged one).
 * 3. `append` rows never change: keep what is here.
 * 4. This device has no unsent change → take it (it is newer than our base).
 * 5. Both changed (a true conflict) → the newer clock wins (or the side the
 *    person chose after signing back in, `prefer`); equal clocks
 *    cannot happen (the device id is part of the clock). For `blocks`, the
 *    loser is kept in History when its content differs.
 */

export interface LocalCopy {
  value: Record<string, unknown>
  /** Clock of the last change on this device. */
  hlc: string
  /** Changed here and not yet accepted by the server. */
  dirty: boolean
}

export interface RemoteCopy {
  value: Record<string, unknown>
  hlc: string
}

export type MergeResult =
  | { action: 'take' }
  | { action: 'keep' }
  | { action: 'take'; loser: Record<string, unknown> }
  | { action: 'keep'; loser: Record<string, unknown> }

const purged = (v: Record<string, unknown>) => typeof v.purgedAt === 'number'

/** Fields that do not count as a content difference. */
const IGNORE = new Set(['updatedAt', 'order', 'parentId'])

function sameContent(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    if (IGNORE.has(k)) continue
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false
  }
  return true
}

export function mergeRecord(
  mode: MergeMode,
  local: LocalCopy | undefined,
  remote: RemoteCopy,
  prefer?: 'here' | 'there',
): MergeResult {
  if (!local) return { action: 'take' }
  if (purged(remote.value) && !purged(local.value)) return { action: 'take' }
  if (purged(local.value) && !purged(remote.value)) return { action: 'keep' }
  if (mode === 'append') return { action: 'keep' }
  if (!local.dirty) return { action: 'take' }
  const remoteWins = prefer ? prefer === 'there' : remote.hlc > local.hlc
  const loser = remoteWins ? local.value : remote.value
  const winner = remoteWins ? remote.value : local.value
  const keepLoser =
    mode === 'blocks' &&
    winner.deletedAt === null &&
    loser.deletedAt === null &&
    !sameContent(winner, loser)
  if (remoteWins)
    return keepLoser ? { action: 'take', loser } : { action: 'take' }
  return keepLoser ? { action: 'keep', loser } : { action: 'keep' }
}
