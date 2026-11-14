/**
 * Text box v2, task 2B.7: moving a box (TB-11 to TB-18). The pure parts of the
 * drag: the 120 ms hold, the 4 s safety end, the 200 ms glide. PaperFrame keeps
 * the planning of the drop (layoutDrop.ts, guides.ts, boxService.ts unchanged).
 * States picture, panels 2 and 3.
 */

/** Hold the tab this long (ms) and the box lifts. */
export const HOLD_MS = 120
/** The box glides into its landing spot this long (ms). */
export const GLIDE_MS = 200
/** Lift: scale 1.02 and elevation 3 over this long (ms). */
export const LIFT_MS = 120
export const LIFT_SCALE = 1.02
/** A lift of the finger that never came: the drag ends after this long (ms). */
export const SAFETY_MS = 4000

export type DragClock = {
  /** Has the 120 ms hold been made? */
  held(): boolean
  /** A sign of the finger (a move): the 4 s start again. */
  touch(): void
  /** The drag ended (or was cancelled): no timer runs on. */
  stop(): void
}

/** The hold timer and the safety timer of one drag. */
export function createDragClock(o: {
  onHold: () => void
  onSafety: () => void
  hold?: number
  safety?: number
}): DragClock {
  let held = false
  let stopped = false
  let safety = 0
  const arm = () => {
    window.clearTimeout(safety)
    safety = window.setTimeout(() => {
      if (!stopped) o.onSafety()
    }, o.safety ?? SAFETY_MS)
  }
  const hold = window.setTimeout(() => {
    if (stopped) return
    held = true
    o.onHold()
  }, o.hold ?? HOLD_MS)
  arm()
  return {
    held: () => held,
    touch: () => {
      if (!stopped) arm()
    },
    stop: () => {
      stopped = true
      window.clearTimeout(hold)
      window.clearTimeout(safety)
    },
  }
}

type R = { left: number; top: number; width: number; height: number }

/** From where the box was let go to where it lands (centres); null when it is already there. */
export function glideFrom(from: R, to: R): { dx: number; dy: number } | null {
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  return Math.hypot(dx, dy) < 0.5 ? null : { dx, dy }
}

/**
 * The glide: one transform from the let-go spot (still lifted) to the landing
 * spot. The box is not tappable (`data-gliding`) until it has landed.
 */
export function playGlide(
  el: HTMLElement,
  by: { dx: number; dy: number },
  done?: () => void,
): void {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || typeof el.animate !== 'function') return done?.()
  el.setAttribute('data-gliding', '')
  const end = () => {
    el.removeAttribute('data-gliding')
    done?.()
  }
  try {
    void el
      .animate(
        [
          {
            transform: `translate(${by.dx}px, ${by.dy}px) scale(${LIFT_SCALE})`,
          },
          { transform: 'translate(0px, 0px) scale(1)' },
        ],
        { duration: GLIDE_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      )
      .finished.then(end, end)
  } catch {
    end()
  }
}

/** Only the ≡ tab (and the layout cover) moves a box; the border strips never do. */
export const tabOnly = (from: Element): boolean =>
  !from.hasAttribute('data-box-band')
