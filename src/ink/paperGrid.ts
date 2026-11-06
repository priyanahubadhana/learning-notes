/**
 * Paper behind the ink (lined, grid, dots): the spacing follows the text's
 * line height, so lines of text sit on the lines (best effort; big text may
 * cross them). The step and the offset of the first line go onto the page as
 * CSS variables (`--paper-step`, `--paper-offset`), read by index.css.
 */

/** The line height in px from computed styles ("normal" = 1.5 x the size). */
export function lineStepOf(lineHeight: string, fontSize: string): number {
  const size = parseFloat(fontSize)
  let step = parseFloat(lineHeight)
  if (!Number.isFinite(step)) step = (Number.isFinite(size) ? size : 16) * 1.5
  return Math.min(80, Math.max(12, Math.round(step * 100) / 100))
}

/** Keeps the two variables up to date while the paper is shown. */
export function watchPaperStep(wrap: HTMLElement): () => void {
  let frame = 0
  const measure = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const text = wrap.querySelector<HTMLElement>('.bn-inline-content')
      if (!text) return
      const cs = getComputedStyle(text)
      const step = lineStepOf(cs.lineHeight, cs.fontSize)
      const offset =
        (text.getBoundingClientRect().top - wrap.getBoundingClientRect().top) %
        step
      wrap.style.setProperty('--paper-step', `${step}px`)
      wrap.style.setProperty('--paper-offset', `${Math.round(offset)}px`)
    })
  }
  measure()
  const resize = new ResizeObserver(measure)
  resize.observe(wrap)
  // A font, size or line-height change (Aa › Style) sets variables on <html>.
  const styles = new MutationObserver(measure)
  styles.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'],
  })
  return () => {
    cancelAnimationFrame(frame)
    resize.disconnect()
    styles.disconnect()
    wrap.style.removeProperty('--paper-step')
    wrap.style.removeProperty('--paper-offset')
  }
}
