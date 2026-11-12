/** Where the edge chips sit (slice 7a). Pure, so a test can check every screen size. */

export const CHIP_H = 44
export const CHIP_GAP = 8
export const EDGE_GAP = 8
/** The first chip sits this far below the top of the reader (RD-B04). */
export const CHIP_TOP = 64

export interface ChipSpot {
  top: number
}

/**
 * Tops of `count` chips stacked under each other, 8 px apart. Starts at
 * `wanted` (64 px below the reader top, or under the bars that are still
 * showing) and is pulled up so the last chip stays fully on screen.
 */
export function chipTops(
  viewportH: number,
  wanted: number,
  count: number,
): number[] {
  if (count <= 0) return []
  const total = count * CHIP_H + (count - 1) * CHIP_GAP
  const maxTop = Math.max(EDGE_GAP, viewportH - EDGE_GAP - total)
  const first = Math.max(EDGE_GAP, Math.min(wanted, maxTop))
  return Array.from(
    { length: count },
    (_, i) => first + i * (CHIP_H + CHIP_GAP),
  )
}
