/**
 * Honest numbers for the must-have update screen (T1-T3, P1-3).
 * - Time left: shown 3 s after the first byte, from the speed of the last
 *   5 s, rounded UP to a step, and it moves at most one step a second.
 * - Slow note: only when the speed stays under 50 KB/s for 8 s in a row; it
 *   goes away by itself when the speed is back.
 * Pure: the caller passes the clock.
 */
export const ETA_AFTER_MS = 3000
export const WINDOW_MS = 5000
export const SLOW_BPS = 50_000
export const SLOW_FOR_MS = 8000
/** The speed is not judged on less than this much data in time. */
const MIN_SPAN_MS = 1000
/** Seconds shown: 5 .. 45 s, then whole minutes. */
export const STEPS = [
  5, 10, 15, 20, 30, 45, 60, 120, 180, 300, 600, 900, 1800, 3600, 7200,
]

/** The smallest step that is not less than the seconds left. */
export function etaStep(seconds: number): number {
  return STEPS[stepIndex(seconds)]
}
function stepIndex(seconds: number): number {
  const i = STEPS.findIndex((s) => s >= seconds)
  return i < 0 ? STEPS.length - 1 : i
}

export interface Reading {
  /** Seconds left, one of STEPS; undefined while unknown. */
  etaS?: number
  /** True only after 8 s in a row under 50 KB/s. */
  slow: boolean
  /** Bytes a second over the last 5 s; undefined before 1 s of data. */
  bps?: number
}

export function createSpeedMeter() {
  let t0: number | undefined
  let samples: { t: number; b: number }[] = []
  let slowSince: number | undefined
  let slow = false
  let idx: number | undefined
  let idxAt = -Infinity

  return {
    add(now: number, loaded: number, total: number): Reading {
      t0 ??= now
      samples.push({ t: now, b: loaded })
      // Keep the last 5 s (and the sample just before them as the start).
      const cut = samples.findIndex((s) => s.t >= now - WINDOW_MS)
      if (cut > 1) samples = samples.slice(cut - 1)
      const first = samples[0]
      const span = now - first.t
      const bps =
        span >= MIN_SPAN_MS ? ((loaded - first.b) / span) * 1000 : undefined

      if (bps !== undefined) {
        if (bps < SLOW_BPS) {
          slowSince ??= now
          slow = now - slowSince >= SLOW_FOR_MS
        } else {
          slowSince = undefined
          slow = false
        }
      }

      let etaS: number | undefined
      if (
        bps !== undefined &&
        bps > 0 &&
        total > loaded &&
        now - t0 >= ETA_AFTER_MS
      ) {
        const target = stepIndex((total - loaded) / bps)
        if (idx === undefined) {
          idx = target
          idxAt = now
        } else if (now - idxAt >= 1000) {
          idx += Math.sign(target - idx)
          idxAt = now
        }
        etaS = STEPS[idx]
      } else if (idx !== undefined && bps !== 0) {
        etaS = STEPS[idx]
      } else if (bps === 0) {
        idx = undefined
      }
      return { etaS, slow, bps }
    },
  }
}
