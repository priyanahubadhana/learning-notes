/**
 * Small bus between the editor commands ("Make card", "/card") and the page
 * that shows the card editor and the Undo toast (slice 15, flag study.v2).
 */
export interface CardMade {
  /** The new card block. */
  blockId: string
  /** What Undo puts back. */
  undo: () => void
}

const made = new Set<(made: CardMade) => void>()
const opened = new Set<(blockId: string) => void>()

export const emitCardMade = (detail: CardMade) =>
  made.forEach((fn) => fn(detail))
export const emitCardOpen = (blockId: string) =>
  opened.forEach((fn) => fn(blockId))

export function onCardMade(fn: (made: CardMade) => void): () => void {
  made.add(fn)
  return () => void made.delete(fn)
}
export function onCardOpen(fn: (blockId: string) => void): () => void {
  opened.add(fn)
  return () => void opened.delete(fn)
}

/** A calm 700 ms glow on a block (none under reduced motion). */
export function glowBlock(blockId: string): void {
  const el = document.querySelector<HTMLElement>(
    `.bn-block-outer[data-id="${CSS.escape(blockId)}"] > .bn-block`,
  )
  if (!el) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const color = 'color-mix(in srgb, var(--color-accent) 18%, transparent)'
  el.animate([{ backgroundColor: color }, { backgroundColor: 'transparent' }], {
    duration: 700,
    easing: 'ease-out',
  })
}
