/**
 * Text box v2, task 2B.7: moving a box (TB-11 to TB-18). The pure parts of the
 * drag: the 120 ms hold, the heartbeat that keeps a held finger alive, the 200 ms glide. PaperFrame keeps
 * the planning of the drop (layoutDrop.ts, guides.ts, boxService.ts unchanged).
 * States picture, panels 2 and 3.
 */
import {
  createEventRouter,
  PRIORITY,
  type RouterTargets,
} from '../../app/input/eventRouter'
import { inputMachine } from '../../app/inputMachine'
import { getAppActions } from '../../app/tools/toolRuntime'
import { undoSince } from '../../core/historySteps'
import { t } from '../../i18n/t'

/** Hold the tab this long (ms) and the box lifts. */
export const HOLD_MS = 120
/** The box glides into its landing spot this long (ms). */
export const GLIDE_MS = 200
/** Lift: scale 1.02 and elevation 3 over this long (ms). */
export const LIFT_MS = 120
export const LIFT_SCALE = 1.02
/** While the finger is held, the drag says "still down" this often (ms). */
export const BEAT_MS = 1000

export type DragClock = {
  /** Has the 120 ms hold been made? */
  held(): boolean
  /** The drag ended (or was cancelled): no timer runs on. */
  stop(): void
}

/**
 * The hold timer and the heartbeat of one drag. A finger that is only held
 * still is still down: the heartbeat tells the shared input machine so (it
 * would drop a pointer that has not moved for 4 s) and asks `lost` whether the
 * pointer is really gone (a lost capture); only then does the drag end.
 */
export function createDragClock(o: {
  pointerId: number
  onHold: () => void
  /** Called every beat; true when the pointer is really lost. */
  lost: () => boolean
  onLost: () => void
  hold?: number
  beat?: number
}): DragClock {
  let held = false
  let stopped = false
  const hold = window.setTimeout(() => {
    if (stopped) return
    held = true
    o.onHold()
  }, o.hold ?? HOLD_MS)
  const beat = window.setInterval(() => {
    if (stopped) return
    if (o.lost()) return o.onLost()
    inputMachine.move({ pointerId: o.pointerId })
  }, o.beat ?? BEAT_MS)
  return {
    held: () => held,
    stop: () => {
      stopped = true
      window.clearTimeout(hold)
      window.clearInterval(beat)
    },
  }
}

/** A move that arrives with no button down: the "finger lifted" was lost on the way. */
export const noButtonDown = (e: { buttons: number }): boolean => e.buttons === 0

/**
 * Listens (through the event router) for the signs that the pointer is gone
 * without a lift: a move with no button down, or the app going to the
 * background (blur, hidden page). `pointercancel` has its own handler.
 */
export function watchFinger(pointerId: number, onLost: () => void): () => void {
  const router = createEventRouter({
    doc: document as unknown as RouterTargets['doc'],
    win: window,
  })
  const o = { priority: PRIORITY.gesture, name: 'textbox.v2.drag' }
  router.subscribe(
    'pointermove',
    (e) => {
      if (e.pointerId === pointerId && noButtonDown(e)) onLost()
    },
    o,
  )
  router.subscribe('background', () => onLost(), o)
  return () => router.destroy()
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
  let ended = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const end = () => {
    if (ended) return
    ended = true
    clearTimeout(timer)
    el.removeAttribute('data-gliding')
    done?.()
  }
  try {
    const a = el.animate(
      [
        {
          transform: `translate(${by.dx}px, ${by.dy}px) scale(${LIFT_SCALE})`,
        },
        { transform: 'translate(0px, 0px) scale(1)' },
      ],
      { duration: GLIDE_MS, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
    void a.finished.then(end, end)
    // WebKit settles `finished` (and even the start) only at its next paint,
    // which came over 1 s late on CI (TB-14): the box stayed not tappable. The
    // landing follows the glide's own clock instead.
    const check = () => {
      const t = a.currentTime == null ? null : Number(a.currentTime)
      if (t === null) {
        try {
          a.finish() // never started: land it now
        } catch {
          // no finish: the box is where it lands anyway
        }
      } else if (t < GLIDE_MS)
        return void (timer = setTimeout(check, GLIDE_MS - t))
      end()
    }
    timer = setTimeout(check, GLIDE_MS)
  } catch {
    end()
  }
}

/** Only the ≡ tab (and the layout cover) moves a box; the border strips never do. */
export const tabOnly = (from: Element): boolean =>
  !from.hasAttribute('data-box-band')

/**
 * Writes the drop and says so: there is no tick to press, a toast says "Box
 * moved" and its Undo takes the page's newest step back (the drop is one step).
 */
export function dropWithUndo(write: () => void): void {
  const since = Date.now()
  write()
  getAppActions()?.toast(t('paper.box.moved'), {
    label: t('paper.box.undo'),
    icon: 'undo',
    onSelect: () => void undoSince(since),
  })
}

/** The lift that never came, made up: where the finger was last seen. */
export const liftAt = (at: { x: number; y: number }) => ({
  type: 'pointerup',
  timeStamp: performance.now(),
  clientX: at.x,
  clientY: at.y,
})
