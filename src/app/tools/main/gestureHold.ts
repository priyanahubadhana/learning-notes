/**
 * Owner (8 Nov): the page never moves under a gesture. When the Pen or the
 * Lasso first touches the page, the tool's options pill closes; the room it
 * kept is given back only when every pointer has lifted, so a stroke or a
 * Lasso loop being drawn stays exactly where it is drawn.
 */

/** Pointers down now, by id. */
const down = new Set<number>()
const waiting: (() => void)[] = []
let installed = false

function install(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  const opts = { capture: true, passive: true } as const
  window.addEventListener('pointerdown', (e) => down.add(e.pointerId), opts)
  const lift = (e?: PointerEvent) => {
    if (e) down.delete(e.pointerId)
    else down.clear()
    if (down.size > 0) return
    for (const fn of waiting.splice(0)) fn()
  }
  window.addEventListener('pointerup', lift, opts)
  window.addEventListener('pointercancel', lift, opts)
  // A lost lift (app switch) must not keep the room for ever.
  window.addEventListener('blur', () => lift())
}
install()

/** Runs `fn` now, or when the gesture in progress ends. */
export function afterGesture(fn: () => void): void {
  if (down.size === 0) fn()
  else waiting.push(fn)
}

/** Tests: is a gesture in progress? */
export const gestureDown = (): boolean => down.size > 0
