import { setReadOnlyGate } from '../core/readOnlyGate'
import { hasStoredSession } from './device'

/**
 * Account gate (owner decision Q3a, 11 Nov 2026). A device with no sign-in
 * on it (never signed in, or signed out) shows its notes READ-ONLY and asks
 * the person to sign in. Reading, search and export keep working; editing,
 * creating and deleting are refused (`core/readOnlyGate.ts`, folded into the
 * edit lock). Nothing is deleted or hidden.
 *
 * "Signed in" means a session is STORED on this device, not that its token is
 * fresh: a signed-in person who is offline with an expired token keeps their
 * session (the stay-signed-in fix) and is never gated. The check reads
 * localStorage only, so it is right on the first paint and after a reload.
 *
 * The off switch is for the browser tests and for support: it only turns this
 * nudge off; it is not a security feature (the notes are on the device).
 */

export const GATE_OFF = 'learning-notes:accountGate.off'

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** Pure rule, for tests: gated = no stored session and the switch is not off. */
export const gateRule = (input: { session: boolean; off: boolean }): boolean =>
  !input.session && !input.off

/** True when this device must sign in before changing anything. */
export const gateActive = (): boolean =>
  gateRule({ session: hasStoredSession(), off: read(GATE_OFF) === '1' })

/** Re-reads the device and flips the switch. Cheap; safe to call often. */
export function refreshGate(): boolean {
  const on = gateActive()
  setReadOnlyGate(on)
  return on
}

/** Starts the gate before the first paint, and follows other windows and tabs. */
export function startAccountGate(): void {
  refreshGate()
  window.addEventListener('storage', refreshGate)
  window.addEventListener('focus', refreshGate)
  window.addEventListener('pageshow', refreshGate)
}
