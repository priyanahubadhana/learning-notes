import { memStore } from '../store'

/**
 * Contextual tool bar (like Word's contextual tabs). Whatever is selected on
 * the page says which strip the bar offers: a picture, a video or embed, a
 * table, a drawing selection or text. Several can be true at once (words and
 * a picture); the first in PRIORITY wins. When nothing is selected any more
 * the bar goes back to the tab or tool it had.
 */
export const CONTEXT_KINDS = [
  'picture',
  'video',
  'table',
  'ink',
  'text',
] as const
export type ContextKind = (typeof CONTEXT_KINDS)[number]

/** What the bar shows now, or null. */
export const selectionContext = memStore<ContextKind | null>(null)
/** The full tool bar is showing the context tab (not the tab it had). */
export const contextTabOn = memStore(false)

const active = new Set<ContextKind>()

/** A selection source says it has (or no longer has) something selected. */
export function setContextActive(kind: ContextKind, on: boolean): void {
  if (on === active.has(kind)) return
  if (on) active.add(kind)
  else active.delete(kind)
  const next = CONTEXT_KINDS.find((k) => active.has(k)) ?? null
  const was = selectionContext.get()
  if (next === was) return
  selectionContext.set(next)
  // New selection: open on its tab. Selection gone: back to the previous tab
  // (the ribbon's own tab was never changed, so only the flag turns off).
  contextTabOn.set(next !== null)
}

/** The full bar opens on the context tab when one exists. */
export function openOnContext(): void {
  if (selectionContext.get() !== null) contextTabOn.set(true)
}

/** Tests only. */
export function resetContext(): void {
  active.clear()
  selectionContext.set(null)
  contextTabOn.set(false)
}
