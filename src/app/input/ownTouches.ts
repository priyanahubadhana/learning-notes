/**
 * A part that works from pointer events alone cancels its own touches (P1.5,
 * first look L11): Safari then never starts handwriting (Scribble) on a Pencil
 * press there, never pans, and never adds a late mouse click, which could land
 * on whatever is behind the part once it has moved or closed. Pointer events
 * keep arriving. Returns the undo.
 */
export function ownTouches(el: HTMLElement): () => void {
  const cancel = (e: TouchEvent) => {
    if (e.cancelable) e.preventDefault()
  }
  el.addEventListener('touchstart', cancel, { passive: false })
  return () => el.removeEventListener('touchstart', cancel)
}
