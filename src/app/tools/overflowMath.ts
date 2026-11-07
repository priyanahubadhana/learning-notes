/** The maths of a bar that scrolls sideways (R7-14, R7-17). See BarScroll.tsx. */

export interface Overflow {
  /** Something is hidden before / after the visible part. */
  start: boolean
  end: boolean
  /** Tools (children) cut off or out of sight at the end / the start. */
  hiddenEnd: number
  hiddenStart: number
  /** Handle size and place as fractions of the track (0..1). */
  thumb: { left: number; width: number } | null
}

export const NONE: Overflow = {
  start: false,
  end: false,
  hiddenEnd: 0,
  hiddenStart: 0,
  thumb: null,
}

/** Pure: what is hidden, from the scroller's measurements. */
export function measureOverflow(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  childEdges: readonly { left: number; right: number }[],
): Overflow {
  const max = scrollWidth - clientWidth
  if (max <= 2 || clientWidth <= 0) return NONE
  const x = Math.min(max, Math.max(0, Math.abs(scrollLeft)))
  const width = Math.min(1, Math.max(0.1, clientWidth / scrollWidth))
  return {
    start: x > 2,
    end: max - x > 2,
    hiddenEnd: childEdges.filter((c) => c.right > x + clientWidth + 2).length,
    hiddenStart: childEdges.filter((c) => c.left < x - 2).length,
    thumb: { left: (x / max) * (1 - width), width },
  }
}

/** Pure: the scroll position for a pointer at `fraction` of the track. */
export function scrollForPointer(
  fraction: number,
  thumbWidth: number,
  max: number,
): number {
  const room = 1 - thumbWidth
  if (room <= 0) return 0
  const f = Math.min(1, Math.max(0, (fraction - thumbWidth / 2) / room))
  return f * max
}
