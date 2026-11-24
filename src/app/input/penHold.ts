/**
 * The Pencil hold, one definition (owner, 25 Nov 2026, 02:00 and 02:10): the
 * Pencil stays within about 3 mm (18 px) of where it touched for 0.8 s. A
 * natural wobble inside that distance does not break it; a quick mark (a
 * comma, a dot) lifts long before and stays ink. Finger and mouse holds keep
 * their own numbers.
 */

/** How long (ms) the Pencil must stay put before it is a hold. */
export const PEN_HOLD_MS = 800
/** How far (px, about 3 mm) the Pencil may drift from where it touched. */
export const PEN_HOLD_SLOP_PX = 18

/** The hold time (ms) for a pointer: the Pencil's own, else `other`. */
export const holdMsFor = (pointerType: string, other: number): number =>
  pointerType === 'pen' ? PEN_HOLD_MS : other

/** The drift (px) a hold of this pointer may have: the Pencil's own, else `other`. */
export const holdSlopFor = (pointerType: string, other: number): number =>
  pointerType === 'pen' ? PEN_HOLD_SLOP_PX : other

/**
 * No Pencil hold and no circle-select within this long (ms) after text was
 * written (typing, Scribble): the Pencil rests and loops while writing, so
 * that is ink (owner, 25 Nov 2026, 01:30).
 */
export const PEN_QUIET_MS = 1000

let wroteAt = 0
/** Text went into a page just now (typing, Scribble, dictation). */
export const noteWritten = (at = Date.now()): void => {
  wroteAt = at
}
/** Was text written within PEN_QUIET_MS? Then Pencil holds and circles wait. */
export const wroteRecently = (now = Date.now()): boolean =>
  now - wroteAt < PEN_QUIET_MS
