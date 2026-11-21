/**
 * A Pencil drag scrolls lists, menus and panels like a finger (owner, 14 Nov
 * 2026; P1.5). On the note page the Pencil still writes: the page is never
 * scrolled from here.
 *
 * Why it is needed: on the app's own bars, menus and panels the Pencil's touch
 * is cancelled (penTap.ts: Scribble must not read it as handwriting), and a
 * cancelled touch does not scroll. So the Pencil could tap a row but not move
 * the list. Here the list follows the tip, 1:1, once the tip has moved past the
 * tap slop; the tap that would follow such a drag is dropped.
 *
 * Watches through the event router and never claims a gesture.
 */
import { CHROME_SELECTOR, MAX_MOVE } from '../penTap'
import { PRIORITY, getEventRouter, type EventRouter } from './eventRouter'

/** Where a Pencil drag is not a scroll: typing, sliders, drawings, things that are dragged. */
const NOT_A_LIST =
  'input, textarea, select, [contenteditable="true"], [data-pen-native], canvas, [draggable="true"]'

/** After a scroll drag lifts, its click (if the browser sends one) is dropped for this long (ms). */
export const CLICK_TAIL_MS = 500

/**
 * The list a Pencil drag on `target` scrolls: the nearest box around it that
 * scrolls up and down, inside the app's own chrome. Null on the note page and
 * around an editor or a drawing (the Pencil writes there).
 */
export function penScrollerOf(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  if (!target.closest(CHROME_SELECTOR) || target.closest(NOT_A_LIST)) {
    return null
  }
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue
    if (el.hasAttribute('data-page-scroller')) return null
    if (el.scrollHeight - el.clientHeight <= 1) continue
    const overflow = getComputedStyle(el).overflowY
    if (overflow !== 'auto' && overflow !== 'scroll') continue
    if (el.querySelector('.bn-editor, canvas')) return null
    return el
  }
  return null
}

interface Drag {
  id: number
  el: HTMLElement
  /** Where the tip was when the list started to follow it. */
  y: number
  top: number
  moved: boolean
  /** The list's own text-selection style, put back when the drag ends. */
  select: string
}

/**
 * Starts watching. `enabled` is read at each Pencil press (the switch).
 * Returns the stop function.
 */
export function installPenScroll(
  enabled: () => boolean = () => true,
  router: EventRouter = getEventRouter(),
  now: () => number = () => Date.now(),
): () => void {
  let drag: Drag | null = null
  /** A scroll drag is on, or has just lifted: its click must not choose a row. */
  let dropClick = false
  let dropUntil = 0
  let offTouch: (() => void) | null = null
  // Watch only, ahead of everyone else (like the tool bar's tuck watcher).
  const first = { priority: PRIORITY.gesture + 1, name: 'pen-scroll' }

  const end = () => {
    if (drag?.moved) drag.el.style.userSelect = drag.select
    drag = null
    offTouch?.()
    offTouch = null
  }

  const offs = [
    router.subscribe(
      'pointerdown',
      (e) => {
        end()
        dropClick = false
        if (e.pointerType !== 'pen' || !enabled()) return
        const el = penScrollerOf(e.target)
        if (!el) return
        drag = {
          id: e.pointerId,
          el,
          y: e.clientY,
          top: el.scrollTop,
          moved: false,
          select: el.style.userSelect,
        }
        // While the Pencil is down on a list, Safari must not pan it as well.
        offTouch = router.subscribe(
          'touchmove',
          (t) => {
            if (t.cancelable) t.preventDefault()
          },
          first,
        )
      },
      first,
    ),
    router.subscribe(
      'pointermove',
      (e) => {
        const d = drag
        if (!d || e.pointerId !== d.id) return
        // No button: the Pencil is only hovering, so its lift was lost.
        if (e.buttons === 0) return end()
        if (!d.moved) {
          if (Math.abs(e.clientY - d.y) < MAX_MOVE) return
          // The list starts to follow from here: no jump by the slop.
          d.moved = true
          d.y = e.clientY
          d.top = d.el.scrollTop
          // A scroll drag never selects the rows' text on its way.
          d.el.style.userSelect = 'none'
          d.el.ownerDocument.getSelection()?.removeAllRanges()
          dropClick = true
          dropUntil = Infinity
          return
        }
        d.el.scrollTop = d.top - (e.clientY - d.y)
      },
      first,
    ),
    router.subscribe(
      'pointerup',
      (e) => {
        if (!drag || e.pointerId !== drag.id) return
        if (drag.moved) dropUntil = now() + CLICK_TAIL_MS
        end()
      },
      first,
    ),
    router.subscribe(
      'pointercancel',
      (e) => {
        if (!drag || e.pointerId !== drag.id) return
        dropClick = false
        end()
      },
      first,
    ),
    router.subscribe(
      'click',
      (e) => {
        if (!dropClick) return
        if (now() > dropUntil) {
          dropClick = false
          return
        }
        // The click of a scroll drag: nobody gets it, no row is chosen.
        if (e.cancelable) e.preventDefault()
        e.stopImmediatePropagation()
        return true
      },
      first,
    ),
  ]
  return () => {
    end()
    offs.forEach((off) => off())
  }
}
