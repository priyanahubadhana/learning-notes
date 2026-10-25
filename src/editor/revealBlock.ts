/**
 * Scrolls a block into view and briefly highlights it (e.g. a card picked
 * in a Card list, or a section chip). Waits up to `timeoutMs` for the block
 * to appear, since a page that was just opened may still be loading.
 *
 * The highlight is a Web Animation, not a CSS class: the editor redraws its
 * own elements and would drop a class we add.
 */
export function revealBlock(blockId: string, timeoutMs = 3000): void {
  const started = performance.now()
  const find = () =>
    document.querySelector<HTMLElement>(
      `.bn-block-outer[data-id="${CSS.escape(blockId)}"] > .bn-block`,
    )
  const attempt = () => {
    const el = find()
    if (!el) {
      if (performance.now() - started < timeoutMs) {
        requestAnimationFrame(attempt)
      }
      return
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    const color = 'color-mix(in srgb, var(--color-accent) 16%, transparent)'
    el.animate(
      [
        { backgroundColor: color, offset: 0 },
        { backgroundColor: color, offset: 0.3 },
        { backgroundColor: 'transparent' },
      ],
      { duration: reduce ? 800 : 1600, easing: 'ease-out', id: 'reveal' },
    )
    // A page that is still loading may redraw the block: reveal it again.
    const watch = () => {
      if (performance.now() - started > timeoutMs) return
      if (el.isConnected) requestAnimationFrame(watch)
      else attempt()
    }
    requestAnimationFrame(watch)
  }
  attempt()
}
