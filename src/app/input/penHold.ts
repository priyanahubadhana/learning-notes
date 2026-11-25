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

/** The longest path (px) the Pencil may travel from its first touch and still hold: the drift itself (a comma-sized wobble; a slow loop round letters is over it before 0.8 s). */
export const PEN_HOLD_PATH_PX = PEN_HOLD_SLOP_PX
/** A step smaller than this (px) from the last counted point is jitter and adds nothing to the path. */
export const PEN_HOLD_STEP_PX = 2

/**
 * A Pencil hold in progress (owner, 25 Nov, review of the "vi" loop). It breaks when
 * the Pencil goes further than PEN_HOLD_SLOP_PX from the first touch, or when the
 * path it has travelled since (the sum of point-to-point distances) passes
 * PEN_HOLD_PATH_PX. A comma-sized wobble stays a hold; a loop round letters,
 * even a small one that never leaves 3 mm, is deliberate movement and breaks it.
 */
export class HoldPath {
  private readonly x0: number
  private readonly y0: number
  private x: number
  private y: number
  private len = 0
  private gone = false
  constructor(x0: number, y0: number) {
    this.x0 = x0
    this.y0 = y0
    this.x = x0
    this.y = y0
  }
  /** Add the next point; true once the hold is broken (and it stays broken). */
  add(x: number, y: number): boolean {
    if (this.gone) return true
    // Jitter (a real Pencil sends 120-240 Hz with up to 1 px of noise) must not add up:
    // only a step of PEN_HOLD_STEP_PX or more from the last counted point counts.
    const step = Math.hypot(x - this.x, y - this.y)
    if (step >= PEN_HOLD_STEP_PX) {
      this.len += step
      this.x = x
      this.y = y
    }
    if (
      Math.hypot(x - this.x0, y - this.y0) > PEN_HOLD_SLOP_PX ||
      this.len > PEN_HOLD_PATH_PX
    )
      this.gone = true
    return this.gone
  }
}
