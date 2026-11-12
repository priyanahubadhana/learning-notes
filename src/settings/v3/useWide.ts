import { useLayoutEffect, useState, type RefObject } from 'react'

/** Settings column + 190 list + 340 preview + gaps: below this the preview is a pill. */
export const WIDE_PX = 980

/**
 * True when the Settings area is wide enough for the three columns. It looks
 * at the area itself (not the window), so an open sidebar is counted too.
 * ResizeObserver, no window listener.
 */
export function useWide(area: RefObject<HTMLElement | null>): boolean {
  const [wide, setWide] = useState(false)
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const measure = () => setWide(el.clientWidth >= WIDE_PX)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [area])
  return wide
}
