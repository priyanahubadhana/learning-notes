/**
 * A box far from the screen shows a placeholder until it comes near (see
 * `LazyMount`). Search and other jumps need the box's real editor now: they
 * call `wakeBox(boxId)` and the placeholder with that id makes its editor.
 */
const listeners = new Set<(boxId: string) => void>()

export function wakeBox(boxId: string): void {
  for (const fn of listeners) fn(boxId)
}

export function onWakeBox(fn: (boxId: string) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
