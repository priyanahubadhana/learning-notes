/**
 * Dragging a floating bar or strip by its grip is drag-only (R6-1).
 *
 * While a grip is held the Pencil or finger must not draw ink, select text,
 * scroll or reach the page. So the grip captures the pointer, the ink and
 * Lasso ignore every pointer (`gripDragging()`), and the page leaves text
 * input for the length of the drag (its editable parts turn read-only, which
 * also closes the keyboard). When the drag ends everything is restored.
 */

let active = 0

/** True while a grip is being dragged. */
export const gripDragging = (): boolean => active > 0

interface Held {
  el: HTMLElement
  was: string
}

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
  const held: Held[] = []
  for (const el of Array.from(
    doc.querySelectorAll<HTMLElement>('[contenteditable="true"]'),
  )) {
    held.push({ el, was: 'true' })
    el.setAttribute('contenteditable', 'false')
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
    doc.removeEventListener('touchmove', stop, true)
    doc.removeEventListener('selectstart', stop, true)
    for (const w of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      doc.removeEventListener(w, end, true)
    }
    for (const h of held) {
      if (h.el.getAttribute('contenteditable') === 'false') {
        h.el.setAttribute('contenteditable', h.was)
      }
    }
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
}
