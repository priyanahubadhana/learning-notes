/**
 * The shared rules of the "wait after wrong tries" limiters (the privacy lock
 * and the sync passphrase box). Each keeps its own count in its own storage
 * key; the arithmetic and the clock text live here so both behave the same.
 *
 * This slows down someone at the device. It is not a defence against an
 * expert who can clear browser storage.
 */

/** Steps for the waits: after `free` wrong tries, `steps[0]`, `steps[1]`, ..., then `cap` each. */
export interface LimiterSteps {
  free: number
  steps: readonly number[]
  cap: number
}

/** How long to wait (ms) after this many wrong tries in a row (0 = still free). */
export function waitFor(rule: LimiterSteps, fails: number): number {
  if (fails < rule.free) return 0
  return rule.steps[fails - rule.free] ?? rule.cap
}

/** Milliseconds left until `until`; a clock set far back cannot stretch it past the cap. */
export function msLeft(rule: LimiterSteps, until: number, now: number): number {
  return Math.max(0, Math.min(rule.cap, until - now))
}

/** "4:32" for a wait in ms (rounded up to the second). */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
