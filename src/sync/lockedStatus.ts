import type { SyncStatus } from './syncStatus'

/**
 * Level 1 alert (docs/research/attention-alerts-2026-11.md): signed in to
 * Sync but this device cannot open the synced notes. Tiny and eager; the
 * pop-up and banner load only when this is true.
 */
export function isLocked(s: Pick<SyncStatus, 'phase' | 'problem'>): boolean {
  if (s.phase === 'signedOut' || s.phase === 'needsSetup') return false
  return (
    s.phase === 'needsKey' ||
    s.problem === 'needCode' ||
    s.problem === 'unreadable'
  )
}
