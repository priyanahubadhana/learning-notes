import type { PillEnv } from './pillEnv'

/** Where each kind sits in the stack, from the bottom (S3-21): a pill never jumps. */
export const PILL_ORDER = [
  'recording',
  'playing',
  'timer',
  'sync',
  'update',
  'custom',
  'zoom',
] as const
export type PillKind = (typeof PILL_ORDER)[number]

/** At most this many pills show; the rest fold into "+n" (D20). */
export const PILL_MAX = 4
/** Distance from the screen edges, px. */
export const PILL_EDGE = 16
export const PILL_GAP = 8
export const KEYBOARD_BAR = 44

export interface Arranged<T> {
  /** Bottom first. */
  shown: T[]
  /** Folded into "+n", bottom first; never holds a recording pill. */
  rest: T[]
}

/**
 * Orders the pills by kind (insertion order inside a kind), shows the first
 * PILL_MAX and folds the rest. Recording is first in the order, so it can
 * never be folded (it is the proof the microphone is on).
 */
export function arrangePills<T extends { kind: PillKind }>(
  pills: readonly T[],
  max = PILL_MAX,
): Arranged<T> {
  const rank = (k: PillKind) => PILL_ORDER.indexOf(k)
  const sorted = pills
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p.kind) - rank(b.p.kind) || a.i - b.i)
    .map((x) => x.p)
  const rec = sorted.filter((p) => p.kind === 'recording')
  const others = sorted.filter((p) => p.kind !== 'recording')
  const room = Math.max(0, max - rec.length)
  return {
    shown: [...rec, ...others.slice(0, room)],
    rest: others.slice(room),
  }
}

/**
 * The stack's distance from the bottom edge (S3-23, S3-29): above the
 * keyboard and its bar, above the tab bar or the Tool frame footer, and above
 * a toast that reaches the corner (8 px gap).
 */
export function pillBottom(env: PillEnv): number {
  const kb = env.keyboard > 0 ? env.keyboard + KEYBOARD_BAR : 0
  const floor = env.toolFooter > 0 ? env.toolFooter : env.tabBar
  const base = PILL_EDGE + kb + floor
  return env.toast > 0 ? Math.max(base, env.toast + PILL_GAP) : base
}

/** On a phone with 3 or more pills, all but the recording pill shrink to icon only (S3-28). */
export function iconOnly(
  kind: PillKind,
  count: number,
  phone: boolean,
): boolean {
  return phone && count >= 3 && kind !== 'recording'
}
