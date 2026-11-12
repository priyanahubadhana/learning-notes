/**
 * Listen: a press-and-hold opens settings only (slice 7b, RD-B11/B12).
 * The hold itself comes from the gesture router; this keeps the one thing
 * the router cannot: the click the browser sends when the finger lifts after
 * a hold must NOT run the tap (it would start the voice).
 */
export function createHoldTap(now: () => number = Date.now, graceMs = 400) {
  let holding = false
  let swallowUntil = 0
  return {
    /** The hold time passed: settings open. */
    hold() {
      holding = true
    },
    /** The finger, Pencil or mouse lifted (or the gesture was cancelled). */
    end() {
      if (!holding) return
      holding = false
      swallowUntil = now() + graceMs
    },
    /** True once for the click that follows a hold. */
    swallowClick(): boolean {
      const s = holding || now() < swallowUntil
      swallowUntil = 0
      return s
    },
  }
}
