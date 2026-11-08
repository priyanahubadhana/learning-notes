import { useEffect, useState, type RefObject } from 'react'
import { rowRange, type RowRange } from './rowWindow'

/** First guess at a row's height, until the real rows are measured. */
const ESTIMATE = 44

/** The element that scrolls `el` up and down (null = the window). */
function scroller(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflow = getComputedStyle(p).overflowY
    if (
      (overflow === 'auto' || overflow === 'scroll') &&
      p.scrollHeight > p.clientHeight + 1
    ) {
      return p
    }
  }
  return null
}

/**
 * Which of `count` rows to draw. `body` is the element holding the rows
 * (a `tbody` or `ul`); the rows before `range.start` are replaced by an
 * empty space of `before` px, the rows after `range.end` by `after` px.
 * The row height is measured from what is drawn, so rows of different
 * height still scroll smoothly.
 */
export function useRowWindow(
  count: number,
  body: RefObject<HTMLElement | null>,
): { range: RowRange; before: number; after: number } {
  const [rowHeight, setRowHeight] = useState(ESTIMATE)
  const [seen, setSeen] = useState({ past: 0, view: 900 })

  const range = rowRange(count, rowHeight, seen.past, seen.view)
  const before = range.start * rowHeight
  const after = (count - range.end) * rowHeight
  const { start, end } = range

  // Follows the scrolling (all state changes happen in animation frames).
  useEffect(() => {
    if (count === 0) return
    const el = body.current
    if (!el) return
    const parent = scroller(el)
    let frame = 0
    const measure = () => {
      frame = 0
      const top = parent ? parent.getBoundingClientRect().top : 0
      const view = parent ? parent.clientHeight : window.innerHeight
      const past = top - el.getBoundingClientRect().top
      setSeen((s) =>
        Math.abs(s.past - past) < 4 && s.view === view ? s : { past, view },
      )
    }
    const later = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const target: HTMLElement | Window = parent ?? window
    target.addEventListener('scroll', later, { passive: true })
    window.addEventListener('resize', later)
    later()
    return () => {
      target.removeEventListener('scroll', later)
      window.removeEventListener('resize', later)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [body, count])

  // Learns the real row height from the rows on screen.
  useEffect(() => {
    const drawn = end - start
    if (count <= drawn || drawn < 5) return
    const frame = requestAnimationFrame(() => {
      const el = body.current
      if (!el) return
      const real = (el.offsetHeight - before - after) / drawn
      if (real > 8 && Math.abs(real - rowHeight) > 1.5) setRowHeight(real)
    })
    return () => cancelAnimationFrame(frame)
  }, [body, count, start, end, before, after, rowHeight])

  return { range, before, after }
}
