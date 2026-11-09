/**
 * Dragging a floating bar or strip by its grip is drag-only (R6-1).
 *
 * While a grip is held the Pencil or finger must not draw ink, select text,
 * scroll or reach the page. So the grip captures the pointer, the ink and
 * Lasso ignore every pointer (`gripDragging()`), and the page leaves text
 * input for the length of the drag (its editable parts turn read-only, which
 * also closes the keyboard). When the drag ends everything is restored.
 */

import { onGestureReset, registerToolState } from '../gestureReset'
import { lock, unlock } from '../../editor/editLock'

let active = 0
/** The drags going on now, each with the way to end it. */
const open = new Set<() => void>()

/** True while a grip is being dragged. */
export const gripDragging = (): boolean => active > 0

/**
 * Ends every drag at once (the watchdog: the lift was lost while the app was
 * in the background, which would leave the page read-only and the ink and
 * Lasso ignoring every pointer, R7-3).
 */
export function resetGripDrags(): void {
  for (const end of [...open]) end()
}

onGestureReset(resetGripDrags)
registerToolState('gripDrag', () => ({
  active,
  open: open.size,
  pageFlag:
    typeof document !== 'undefined' &&
    document.documentElement.hasAttribute('data-grip-drag'),
}))

let grips = 0

/**
 * Call from a grip's pointerdown. It captures the pointer on the grip and
 * ends itself on pointer up, cancel or lost capture.
 */
export function startGripDrag(
  grip: Element,
  pointerId: number,
  doc: Document = document,
): void {
  try {
    grip.setPointerCapture(pointerId)
  } catch {
    // A pointer the browser does not know (a test): the window still hears it.
  }
  active++
  const root = doc.documentElement
  root.setAttribute('data-grip-drag', '')
  const refocus =
    doc.activeElement instanceof HTMLElement &&
    doc.activeElement.isContentEditable
      ? doc.activeElement
      : null
  // The editable parts leave text input for the drag (edit locks: nothing is
  // remembered, the last lock puts each element right).
  const held: string[] = []
  const me = grips++
  for (const el of Array.from(
    doc.querySelectorAll<HTMLElement>('[contenteditable="true"]'),
  )) {
    const owner = 'grip' + me + ':' + held.length
    held.push(owner)
    lock(owner, el)
  }
  refocus?.blur()
  const stop = (e: Event) => {
    if (e.cancelable) e.preventDefault()
  }
  doc.addEventListener('touchmove', stop, { passive: false, capture: true })
  doc.addEventListener('selectstart', stop, true)
  let done = false
  const end = (e?: Event) => {
    if (done) return
    if (e instanceof PointerEvent && e.pointerId !== pointerId) return
    done = true
    open.delete(force)
    doc.removeEventListener('touchmove', stop, true)
    doc.removeEventListener('selectstart', stop, true)
    for (const w of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      doc.removeEventListener(w, end, true)
    }
    for (const owner of held) unlock(owner)
    // A moment later, so the page sees the lift as part of the drag.
    window.setTimeout(() => {
      active = Math.max(0, active - 1)
      if (active === 0) root.removeAttribute('data-grip-drag')
      if (refocus && refocus.isConnected) {
        try {
          refocus.focus({ preventScroll: true })
        } catch {
          // Focus is a nicety.
        }
      }
    }, 60)
  }
  for (const w of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    doc.addEventListener(w, end, true)
  }
  const force = () => {
    try {
      grip.releasePointerCapture(pointerId)
    } catch {
      // Already released.
    }
    end()
  }
  open.add(force)
}
