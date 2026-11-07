import type { Pt } from './geometry'

/**
 * Taps are not ink (owner, iPad: double taps left dots, commas and ticks).
 * Pure rules, tunable here; the numbers are logged in DECISIONS.
 *
 * - A stroke that lasted under `TAP_MS` and travelled under `TAP_PX` is a
 *   tap: nothing is drawn. A press held a moment longer is a deliberate dot.
 * - A stroke that is nearly a tap (`SHORT_MS`, `SHORT_PX`) is remembered; a
 *   second one at the same spot within `DOUBLE_MS` and `DOUBLE_PX` makes a
 *   double tap: the first mark is taken back and the double tap is a gesture
 *   (select the word under it), never ink.
 */

/** Down-and-up quicker than this (ms) with almost no travel is a tap. */
export const TAP_MS = 90
/** Travel (px, from the first point) a tap may have. */
export const TAP_PX = 4
/** A stroke this short (ms, px) may be the first half of a double tap. */
export const SHORT_MS = 160
export const SHORT_PX = 10
/** Two short strokes this close in time (ms) and space (px) are a double tap. */
export const DOUBLE_MS = 350
export const DOUBLE_PX = 24

export interface TapMark {
  at: number
  x: number
  y: number
}

/** The farthest any point got from the first one (px). */
export function travelOf(pts: readonly Pt[]): number {
  const first = pts[0]
  if (!first) return 0
  let far = 0
  for (const p of pts)
    far = Math.max(far, Math.hypot(p.x - first.x, p.y - first.y))
  return far
}

/** A quick touch that barely moved: not ink. */
export const isTap = (ms: number, travel: number): boolean =>
  ms < TAP_MS && travel < TAP_PX

/** Short enough to be half of a double tap. */
export const isShort = (ms: number, travel: number): boolean =>
  ms < SHORT_MS && travel < SHORT_PX

/** Is `now` the second tap of a double tap after `last`? */
export const isDoubleTap = (last: TapMark | null, now: TapMark): boolean =>
  !!last &&
  now.at - last.at < DOUBLE_MS &&
  Math.hypot(now.x - last.x, now.y - last.y) < DOUBLE_PX
