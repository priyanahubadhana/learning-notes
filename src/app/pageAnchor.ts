/**
 * Choosing a tool never moves the page (R6-8).
 *
 * A tool's options pill takes room beside the page (a space above it, or
 * padding on one edge), so the lines under the person's eyes slid by the
 * pill's height when it opened or closed. When a tool is chosen on the main
 * bar or the ribbon (or its pill is closed) we note the first visible line of
 * the page and, for a moment, put the page back so that line stays where it
 * was on the screen. The pill then floats over the page, as it does in other
 * note apps. A touch on the page or a wheel ends it at once, so a real scroll
 * is never fought.
 */

/** The buttons that choose a tool or close its pill (not New line, Undo...). */
const CHOOSES =
  '[data-bar-tool]:not([data-bar-tool="newLine"]):not([data-bar-tool="backspace"]), ' +
  '[role="tab"][data-tab], [data-pill-close], ' +
  '[data-bar-btn][data-action="text"], [data-bar-btn][data-action="read"], ' +
  '[data-bar-btn][data-action="pen"], [data-bar-btn][data-action="highlighter"], ' +
  '[data-bar-btn][data-action="eraser"], [data-bar-btn][data-action="lasso"]'

/** How long the page is held after a choice (ms). */
export const HOLD_MS = 450

/** Debugging aid for tests. */
export const anchorStats = { corrections: 0 }

export function installPageAnchor(doc: Document = document): () => void {
  let stop: (() => void) | null = null

  const scroller = () => doc.querySelector<HTMLElement>('[data-page-scroller]')

  /** Holds the page still for a moment. */
  const hold = () => {
    const box = scroller()
    if (!box || box.scrollTop <= 0.5) return
    const edge = box.getBoundingClientRect().top + 8
    const first = [...box.querySelectorAll('.bn-block-content')].find(
      (b) => b.getBoundingClientRect().bottom > edge,
    )
    // The line is found again by its id each frame: a tool can redraw it.
    const id = first?.closest('.bn-block[data-id]')?.getAttribute('data-id')
    if (!first || !id) return
    const find = () =>
      box.querySelector(
        `.bn-block[data-id="${CSS.escape(id)}"] .bn-block-content`,
      )
    stop?.()
    const at = first.getBoundingClientRect().top
    const until = performance.now() + HOLD_MS
    let frame = 0
    let expected = box.scrollTop
    // A scroll that is not ours (the person, a script) ends the hold.
    const onScroll = () => {
      if (Math.abs(box.scrollTop - expected) > 1) end()
    }
    const tick = () => {
      const line = find()
      if (!line || !box.isConnected) return end()
      const delta = line.getBoundingClientRect().top - at
      if (Math.abs(delta) > 1) {
        box.scrollTop += delta
        expected = box.scrollTop
        anchorStats.corrections++
      }
      if (performance.now() < until) frame = requestAnimationFrame(tick)
      else end()
    }
    const end = () => {
      cancelAnimationFrame(frame)
      for (const n of ['wheel', 'touchstart'] as const) {
        box.removeEventListener(n, end)
      }
      box.removeEventListener('scroll', onScroll)
      stop = null
    }
    for (const n of ['wheel', 'touchstart'] as const) {
      box.addEventListener(n, end, { passive: true })
    }
    box.addEventListener('scroll', onScroll, { passive: true })
    stop = end
    frame = requestAnimationFrame(tick)
  }

  const onDown = (e: Event) => {
    const t = e.target
    if (t instanceof Element && t.closest(CHOOSES)) hold()
    else stop?.()
  }
  // Escape closes the options pill.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && doc.querySelector('[data-options-pill]')) hold()
  }
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('keydown', onKey, true)
  return () => {
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('keydown', onKey, true)
    stop?.()
  }
}
