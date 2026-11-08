/**
 * Phase Q rule 4: the Pencil (or the mouse with the Pen) writes on empty
 * paper, outside every box. The stroke is recorded; the page makes a box
 * with empty lines there, and once that box's ink pad is on screen the same
 * stroke is played into it, so it lands linked to a line like any ink.
 */

export interface Recorded {
  type: string
  x: number
  y: number
  pressure: number
  tiltX: number
  tiltY: number
  pointerType: string
  pointerId: number
}

export const record = (type: string, e: PointerEvent): Recorded => ({
  type,
  x: e.clientX,
  y: e.clientY,
  pressure: e.pressure,
  tiltX: e.tiltX,
  tiltY: e.tiltY,
  pointerType: e.pointerType,
  pointerId: e.pointerId,
})

/** The stroke's box on screen (client px). */
export function bounds(events: readonly Recorded[]) {
  const xs = events.map((e) => e.x)
  const ys = events.map((e) => e.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** Waits (up to `ms`) for an element to appear, checking every frame. */
export function waitFor<T>(find: () => T | null, ms = 3000): Promise<T | null> {
  const end = performance.now() + ms
  return new Promise((resolve) => {
    const look = () => {
      const found = find()
      if (found) return resolve(found)
      if (performance.now() > end) return resolve(null)
      requestAnimationFrame(look)
    }
    look()
  })
}

/** Plays a recorded stroke into an ink pad, as the same pointer events. */
export function replay(pad: Element, events: readonly Recorded[]): void {
  for (const e of events) {
    pad.dispatchEvent(
      new PointerEvent(e.type, {
        pointerType: e.pointerType,
        pointerId: e.pointerId,
        clientX: e.x,
        clientY: e.y,
        pressure: e.type === 'pointerup' ? 0 : e.pressure || 0.5,
        tiltX: e.tiltX,
        tiltY: e.tiltY,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        button: 0,
        buttons: e.type === 'pointerup' ? 0 : 1,
      }),
    )
  }
}
