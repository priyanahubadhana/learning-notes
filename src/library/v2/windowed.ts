import { useEffect, useState } from 'react'

/** Books drawn at first, and added each time the end comes into view. */
export const WINDOW_STEP = 60

/** How many to draw after the end was reached: one more step, never past the total. */
export const nextWindow = (current: number, total: number): number =>
  Math.min(total, current + WINDOW_STEP)

/**
 * Draws a long list in steps (1,000+ books): the first step at once, then one
 * more each time the returned `sentinel` element scrolls into view. Counts
 * and sorting still use the whole list; only the drawing is windowed.
 */
export function useWindowed(total: number) {
  const [limit, setLimit] = useState(WINDOW_STEP)
  const [sentinel, setSentinel] = useState<HTMLLIElement | null>(null)
  const more = limit < total
  useEffect(() => {
    const el = sentinel
    if (!el || !more || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (hits) => {
        if (hits.some((h) => h.isIntersecting))
          setLimit((n) => nextWindow(n, total))
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [more, total, limit, sentinel])
  return { limit, more, watchEnd: setSentinel }
}
