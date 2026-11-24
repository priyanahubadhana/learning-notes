/**
 * Passive capture-phase pointer listeners on a window, for code that reads a
 * whole stroke (the Pencil circle, circleSelect.ts) and never stops or changes
 * an event. Capture on the window runs before every page handler, so a handler
 * that stops the event later cannot hide the stroke. Returns the stop function.
 */
export function watchPointers(
  win: Window,
  on: {
    down: (e: PointerEvent) => void
    move: (e: PointerEvent) => void
    end: (e: PointerEvent) => void
  },
): () => void {
  const o = { capture: true, passive: true } as const
  win.addEventListener('pointerdown', on.down, o)
  win.addEventListener('pointermove', on.move, o)
  win.addEventListener('pointerup', on.end, o)
  win.addEventListener('pointercancel', on.end, o)
  return () => {
    win.removeEventListener('pointerdown', on.down, o)
    win.removeEventListener('pointermove', on.move, o)
    win.removeEventListener('pointerup', on.end, o)
    win.removeEventListener('pointercancel', on.end, o)
  }
}
