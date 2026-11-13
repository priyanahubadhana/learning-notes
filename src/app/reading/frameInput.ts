/**
 * A tap or Alt+↑/↓ inside a book's frame (EPUB), in screen terms, for the
 * reading ruler (RD-P29). A plain list of listeners: no DOM events.
 */
export interface FrameInput {
  y?: number
  key?: string
}
type Listener = (d: FrameInput) => void
const listeners = new Set<Listener>()

export const sendFrameInput = (d: FrameInput) => {
  for (const l of listeners) l(d)
}
export const onFrameInput = (l: Listener): (() => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
