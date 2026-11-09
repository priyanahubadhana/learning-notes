/**
 * "Select this picture block now": placing or pasting a picture asks, and the
 * picture handles (which own the selection) answer. Keeps images/ free of
 * editor code.
 */
let pending: string | null = null
const listeners = new Set<() => void>()

export function requestPictureSelect(blockId: string): void {
  pending = blockId
  listeners.forEach((fn) => fn())
}

/** Takes the waiting request (once). */
export function takePictureSelect(): string | null {
  const id = pending
  pending = null
  return id
}

export function onPictureSelect(fn: () => void): () => void {
  listeners.add(fn)
  if (pending) fn()
  return () => {
    listeners.delete(fn)
  }
}
