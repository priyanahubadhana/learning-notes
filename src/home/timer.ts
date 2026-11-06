/**
 * Timer maths (F2). Nothing here ticks: the time shown is always `now`
 * minus the stored start, so a reload, a sleeping iPad or a closed app never
 * loses or invents time. Pomodoro (Focus mode) is a pure function of the
 * elapsed time too: focus, a short break, focus … and a long break after
 * every Nth focus.
 */

export const MIN = 60_000

/** Focus length, short break, long break (minutes) and focus rounds per long break. */
export interface Cycle {
  focus: number
  short: number
  long: number
  every: number
}

export const DEFAULT_CYCLE: Cycle = { focus: 25, short: 5, long: 15, every: 4 }

export const toCycleList = (c: Cycle): number[] => [
  c.focus,
  c.short,
  c.long,
  c.every,
]

export function fromCycleList(list: readonly number[] | undefined): Cycle {
  if (!list || list.length !== 4) return DEFAULT_CYCLE
  const [focus, short, long, every] = list
  return clampCycle({ focus, short, long, every })
}

/** Lengths stay sensible: 1 to 180 minutes, 1 to 12 rounds. */
export function clampCycle(c: Cycle): Cycle {
  const m = (v: number, lo: number, hi: number, fallback: number) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback
  return {
    focus: m(c.focus, 1, 180, DEFAULT_CYCLE.focus),
    short: m(c.short, 1, 60, DEFAULT_CYCLE.short),
    long: m(c.long, 1, 120, DEFAULT_CYCLE.long),
    every: m(c.every, 1, 12, DEFAULT_CYCLE.every),
  }
}

/** Elapsed time of a run; never negative (a clock set back counts as 0). */
export const elapsedMs = (startedAt: number, now: number): number =>
  Math.max(0, now - startedAt)

export type Phase = 'focus' | 'short' | 'long'

export interface PhaseInfo {
  phase: Phase
  /** Which focus round this phase belongs to (1-based). */
  round: number
  intoMs: number
  remainingMs: number
}

const phaseLength = (phase: Phase, c: Cycle): number =>
  (phase === 'focus' ? c.focus : phase === 'short' ? c.short : c.long) * MIN

/** Where in the cycle `elapsed` falls. */
export function phaseAt(elapsed: number, cycle: Cycle): PhaseInfo {
  const c = clampCycle(cycle)
  const superLength =
    c.every * c.focus * MIN + (c.every - 1) * c.short * MIN + c.long * MIN
  let rest = Math.max(0, elapsed) % superLength
  const laps = Math.floor(Math.max(0, elapsed) / superLength)
  for (let i = 1; i <= c.every; i++) {
    const round = laps * c.every + i
    const focus = phaseLength('focus', c)
    if (rest < focus) {
      return { phase: 'focus', round, intoMs: rest, remainingMs: focus - rest }
    }
    rest -= focus
    const breakPhase: Phase = i === c.every ? 'long' : 'short'
    const length = phaseLength(breakPhase, c)
    if (rest < length) {
      return {
        phase: breakPhase,
        round,
        intoMs: rest,
        remainingMs: length - rest,
      }
    }
    rest -= length
  }
  // Unreachable (rest < superLength), kept for the type checker.
  return { phase: 'focus', round: 1, intoMs: 0, remainingMs: c.focus * MIN }
}

/** Focus time inside the first `elapsed` ms of a Focus run (breaks excluded). */
export function focusMsWithin(elapsed: number, cycle: Cycle): number {
  const c = clampCycle(cycle)
  const total = Math.max(0, elapsed)
  const superLength =
    c.every * c.focus * MIN + (c.every - 1) * c.short * MIN + c.long * MIN
  const laps = Math.floor(total / superLength)
  let rest = total - laps * superLength
  let ms = laps * c.every * c.focus * MIN
  for (let i = 1; i <= c.every && rest > 0; i++) {
    const focus = c.focus * MIN
    ms += Math.min(rest, focus)
    rest -= focus
    if (rest <= 0) break
    rest -= (i === c.every ? c.long : c.short) * MIN
  }
  return ms
}

/** "1:05:09" or "5:09" for a length in ms. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`
}

/** "2 h 05 min" / "35 min" for a rounded length in ms. */
export function hoursLabel(ms: number): string {
  const minutes = Math.round(ms / MIN)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}

/** Ask "Still working?" after this long without an answer. */
export const STILL_WORKING_MS = 2 * 60 * MIN
