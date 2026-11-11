/**
 * Account gate (owner decision Q3a, 11 Nov 2026): a device that has no
 * sign-in shows its notes read-only until the person signs in. This is only
 * the switch; WHEN it is on is decided in `sync/gateRule.ts`, and the
 * refusal (`assertSignedIn`) lives with the edit lock in `editLock.ts`. It
 * never deletes or hides anything: it only refuses new edits, creations and
 * deletions. Reading, search and export stay free.
 */

let on = false
const listeners = new Set<() => void>()

/** True while this device must sign in before changing anything. */
export const isReadOnlyGate = (): boolean => on

export function setReadOnlyGate(next: boolean): void {
  if (next === on) return
  on = next
  for (const l of listeners) l()
}

export function subscribeReadOnlyGate(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
