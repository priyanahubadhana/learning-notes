/**
 * "Text was typed without a key" (C18): the mini keyboard's mic and Enter put
 * text in the page though no key is pressed. The paper listens, so a box
 * being written in shows only its thin border (no handle dots).
 */
const listeners = new Set<() => void>()

export const noteTyped = (): void => listeners.forEach((l) => l())

export function onTyped(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
