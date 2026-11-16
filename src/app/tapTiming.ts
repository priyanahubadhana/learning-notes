import { isOn } from './flags'

/**
 * One tap timing for the whole page (C14, owner's combined test 16 Nov;
 * switch textbox.v2). The text taps allowed 450 ms between taps, the ink
 * layer only 300 ms, and a Pencil tap there had to be under 150 ms and 3 px
 * to count as half of a double tap: a normal Pencil tap is often longer or
 * drifts more, so double and triple taps worked only sometimes.
 *
 * Now, with the switch on:
 *  - taps up to `gapMs()` apart add up (500 ms; the preview "Tap speed"
 *    choice can make it 350 or 700);
 *  - a Pencil tap may last up to 250 ms and move up to 8 px.
 * With the switch off the old numbers hold. Pure reads, tested.
 */

export const TAP_SPEEDS = { quick: 350, normal: 500, relaxed: 700 } as const
export type TapSpeed = keyof typeof TAP_SPEEDS

/** Preview only: the owner's "Tap speed" pick (removed before release). */
export const TAP_SPEED_KEY = 'learning-notes:preview.tapSpeed'

/** The tap speed picked on this device (Normal when none). */
export function tapSpeed(): TapSpeed {
  try {
    const v = JSON.parse(localStorage.getItem(TAP_SPEED_KEY) ?? 'null')
    return v in TAP_SPEEDS ? (v as TapSpeed) : 'normal'
  } catch {
    return 'normal'
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
