import { useLayoutEffect, type RefObject } from 'react'

/** The CSS variable the reader's bars read (shell.css): where they may start. */
export const READER_INSET_VAR = '--sh-reader-left'

/**
 * The reader's bar is fixed across the top of the window. The top bar's menu
 * buttons (marked `data-lead`) sit under it, so the reader's ✕ Exit reading
 * would land on them. This keeps the variable at the right edge of those
 * buttons; the reader's bars start there instead (shell.css). A ResizeObserver
 * (no raw resize listener) re-measures when the bar or a button changes size.
 */
export function useReaderInset(bar: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const el = bar.current
    if (!el) return
    const root = document.documentElement
    const measure = () => {
      let right = 0
      for (const b of el.querySelectorAll<HTMLElement>('[data-lead]')) {
        const r = b.getBoundingClientRect()
        if (r.width > 0) right = Math.max(right, r.right)
      }
      if (right > 0)
        root.style.setProperty(READER_INSET_VAR, `${Math.ceil(right) + 4}px`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const b of el.querySelectorAll('[data-lead]')) ro.observe(b)
    return () => {
      ro.disconnect()
      root.style.removeProperty(READER_INSET_VAR)
    }
  })
}
