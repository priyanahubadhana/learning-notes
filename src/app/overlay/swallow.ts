/**
 * The tap that only closes a card or menu (spec: foundation-selection-overlay.md,
 * "first outside tap"; toolbar-v8 TB-06). Its pointerdown is stopped by the
 * caller; this swallows what the same tap still sends afterwards: the
 * pointerup and the click (pen, touch and mouse alike). It listens only while
 * armed and lets go after the click, a pointercancel (the finger scrolled
 * instead), the next pointerdown, or CLICK_WAIT_MS after the pointerup.
 */

/** Longest wait for the click after the pointerup (touch clicks come late). */
export const CLICK_WAIT_MS = 700

type Listen = (
  type: 'pointerup' | 'click' | 'pointercancel',
  fn: (e: Event) => void,
) => () => void

/** Stops an event completely: no default, nobody after us. */
export function stopTap(e: Event): void {
  if (e.cancelable) e.preventDefault()
  e.stopImmediatePropagation()
}

export function createTapSwallower(
  listen: Listen,
  timers: Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'> = globalThis,
) {
  let offs: Array<() => void> = []
  let timer: ReturnType<typeof setTimeout> | undefined

  function disarm() {
    offs.forEach((off) => off())
    offs = []
    if (timer !== undefined) timers.clearTimeout(timer)
    timer = undefined
  }

  /** Call right after swallowing a pointerdown. */
  function arm() {
    disarm()
    offs = [
      listen('pointerup', (e) => {
        stopTap(e)
        // The click follows the pointerup; never wait for it forever.
        if (timer === undefined)
          timer = timers.setTimeout(disarm, CLICK_WAIT_MS)
      }),
      listen('click', (e) => {
        // detail 0 = a click from the keyboard (Enter/Space), not this tap.
        if ((e as MouseEvent).detail !== 0) stopTap(e)
        disarm()
      }),
      listen('pointercancel', () => disarm()),
    ]
  }

  return { arm, disarm, armed: () => offs.length > 0 }
}
