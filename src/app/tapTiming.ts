import { isOn } from './flags'

/**
 * One tap timing for the whole page (C14, owner's combined test 16 Nov;
 * switch textbox.v2). The text taps allowed 450 ms between taps, the ink
 * layer only 300 ms, and a Pencil tap there had to be under 150 ms and 3 px
 * to count as half of a double tap: a normal Pencil tap is often longer or
 * drifts more, so double and triple taps worked only sometimes.
 *
 * Now, with the switch on:
 *  - taps up to `gapMs()` apart add up (700 ms, C19; the preview "Tap speed"
 *    choice can make it 350 or 700);
 *  - a Pencil tap may last up to 250 ms and move up to 8 px.
 * With the switch off the old numbers hold. Pure reads, tested.
 */

export const TAP_SPEEDS = { quick: 350, normal: 500, relaxed: 700 } as const
export type TapSpeed = keyof typeof TAP_SPEEDS

/** Preview only: the owner's "Tap speed" pick (removed before release). */
export const TAP_SPEED_KEY = 'learning-notes:preview.tapSpeed'

/**
 * The tap speed when none is picked (C19, owner's iPad re-test 16 Nov:
 * "Relaxed felt best"; with Normal, double and triple taps still failed).
 */
export const DEFAULT_TAP_SPEED: TapSpeed = 'relaxed'

/** The tap speed picked on this device (Relaxed when none). */
export function tapSpeed(): TapSpeed {
  try {
    const v = JSON.parse(localStorage.getItem(TAP_SPEED_KEY) ?? 'null')
    return v in TAP_SPEEDS ? (v as TapSpeed) : DEFAULT_TAP_SPEED
  } catch {
    return DEFAULT_TAP_SPEED
  }
}

/** Is the shared timing on (switch textbox.v2)? */
export const sharedTiming = (): boolean => isOn('textbox.v2')

/** Taps this far apart (ms) or closer add up; `old` is the switch-off value. */
export const gapMs = (old: number): number =>
  sharedTiming() ? TAP_SPEEDS[tapSpeed()] : old

/** The longest press (ms) that is still a tap. */
export const tapHoldMs = (old: number): number => (sharedTiming() ? 250 : old)

/** The furthest (px) a Pencil may drift during a tap. */
export const tapMovePx = (old: number): number => (sharedTiming() ? 8 : old)

/**
 * Are two taps `ms` apart one run? Switch on: up to the tap gap, the gap
 * itself included ("up to 500 ms"); switch off: under `old`, as before.
 */
export const withinGap = (ms: number, old: number): boolean =>
  sharedTiming() ? ms <= TAP_SPEEDS[tapSpeed()] : ms < old

/**
 * When the hand did it (C14): the browser's own time stamp of an event, on
 * the page's clock (ms since the page opened).
 *
 * Why: taps were timed with `Date.now()` inside the listener, which is when
 * the page got round to the event. On a busy page (a repaint, a sync, a long
 * note) the listener runs late, so a 200 ms tap read as a hold and two taps
 * 400 ms apart read as two single taps. The time stamp is set when the
 * Pencil touched, however late the listener runs. Tap times are compared
 * only with other time stamps, or with `stampNow()` (the same clock) where
 * no event is at hand.
 */
export const stampOf = (e: { timeStamp: number }): number =>
  e.timeStamp > 0 ? e.timeStamp : stampNow()

/** Now, on the clock of the events' time stamps. */
export const stampNow = (): number => performance.now()
