/**
 * Palm guard for the picture editor and the mind map (polish 1, item 9).
 *
 * While the Pencil is down, a touch is almost always a palm resting on the
 * screen, so those editors ignore it. This is the same idea as the guard in
 * `penTap.ts` ("any other pointer resets it"), kept here as a tiny shared
 * check the editors can ask: `ignoreTouch(event)`.
 */

import { onGestureReset, registerToolState } from './gestureReset'

/** A Pencil that stayed "down" for this long without any event is forgotten. */
export const STALE_MS = 3000

let penId: number | null = null
let lastPenEvent = 0
let lastPenLift = 0

function onPen(e: PointerEvent) {
  if (e.pointerType !== 'pen') return
  lastPenEvent = Date.now()
  if (e.type === 'pointerdown' || e.type === 'pointermove') {
    if (e.type === 'pointerdown' || penId === e.pointerId) penId = e.pointerId
  } else if (penId === e.pointerId) {
    penId = null // pointerup, pointercancel
    lastPenLift = Date.now()
  }
}

/** Starts watching (once). Safe to call again. */
function installPalmGuard(doc: Document = document): void {
  if (installed.has(doc)) return
  installed.add(doc)
  for (const type of [
    'pointerdown',
    'pointermove',
    'pointerup',
    'pointercancel',
  ]) {
    doc.addEventListener(type, onPen as EventListener, true)
  }
}
const installed = new WeakSet<Document>()
if (typeof document !== 'undefined') installPalmGuard()

// The watchdog: a Pencil whose lift was lost is forgotten at once (not only
// after STALE_MS), so a finger is never ignored after coming back.
onGestureReset(() => {
  penId = null
})
registerToolState('palmGuard', () => ({
  penId,
  penIsDown: penIsDown(),
  penEventAgoMs: lastPenEvent ? Date.now() - lastPenEvent : null,
  penLiftAgoMs: lastPenLift ? Date.now() - lastPenLift : null,
}))

/** True while a Pencil pointer is down. */
export function penIsDown(now: number = Date.now()): boolean {
  return penId !== null && now - lastPenEvent < STALE_MS
}

/** True for a touch that should be ignored because the Pencil is down. */
export function ignoreTouch(
  e: { pointerType: string },
  now: number = Date.now(),
): boolean {
  return e.pointerType === 'touch' && penIsDown(now)
}

/** A palm often lands just as the Pencil lifts, so a touch is also ignored this long afterwards. */
export const PALM_TAIL_MS = 500

/** True for a touch pointer that is probably a palm: the Pencil is down or has just lifted. */
export function palmTouch(
  e: { pointerType: string },
  now: number = Date.now(),
): boolean {
  return (
    e.pointerType === 'touch' &&
    (penIsDown(now) || now - lastPenLift < PALM_TAIL_MS)
  )
}

/**
 * A touch on a bar that is probably a palm: the Pencil touched the screen a
 * moment ago (under 400 ms) or lifted under 500 ms ago. A Pencil left "down"
 * without any event (a lost lift) does not count, so a finger is never stuck.
 */
export function barPalm(
  e: { pointerType: string },
  now: number = Date.now(),
): boolean {
  return (
    e.pointerType === 'touch' &&
    ((penId !== null && now - lastPenEvent < 400) ||
      now - lastPenLift < PALM_TAIL_MS)
  )
}

/** Tests only. */
export function resetPalmGuard(): void {
  penId = null
  lastPenEvent = 0
  lastPenLift = 0
}
