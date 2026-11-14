/**
 * Passive window listeners for a recorder that only watches (the hidden Pencil
 * check, P1.5a). Never stops or changes an event. Returns the stop function.
 */
export function watchWindowEvents(
  types: readonly string[],
  onCapture: (e: Event) => void,
  onBubble: (e: Event) => void,
): () => void {
  const cap = { capture: true, passive: true } as const
  const bub = { passive: true } as const
  for (const t of types) {
    window.addEventListener(t, onCapture, cap)
    window.addEventListener(t, onBubble, bub)
  }
  return () => {
    for (const t of types) {
      window.removeEventListener(t, onCapture, { capture: true })
      window.removeEventListener(t, onBubble)
    }
  }
}

/** One passive bubble-phase listener per type; for recorders. Returns the stop function. */
export function watchWindowPassive(
  types: readonly string[],
  on: (e: Event) => void,
): () => void {
  for (const t of types) window.addEventListener(t, on, { passive: true })
  return () => {
    for (const t of types) window.removeEventListener(t, on)
  }
}
