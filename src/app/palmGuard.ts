/**
 * Palm guard for the picture editor and the mind map (polish 1, item 9).
 *
 * While the Pencil is down, a touch is almost always a palm resting on the
 * screen, so those editors ignore it. This is the same idea as the guard in
 * `penTap.ts` ("any other pointer resets it"), kept here as a tiny shared
 * check the editors can ask: `ignoreTouch(event)`.
 */

/** A Pencil that stayed "down" for this long without any event is forgotten. */
const STALE_MS = 3000

let penId: number | null = null
let lastPenEvent = 0

function onPen(e: PointerEvent) {
  if (e.pointerType !== 'pen') return
  lastPenEvent = Date.now()
  if (e.type === 'pointerdown' || e.type === 'pointermove') {
    if (e.type === 'pointerdown' || penId === e.pointerId) penId = e.pointerId
  } else if (penId === e.pointerId) {
    penId = null // pointerup, pointercancel
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

/** Tests only. */
export function resetPalmGuard(): void {
  penId = null
  lastPenEvent = 0
}
