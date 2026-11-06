/**
 * Picture resize (G3): the maths behind dragging a corner handle. Pure, so
 * it is tested without a browser.
 */

export type Corner = 'nw' | 'ne' | 'sw' | 'se'
export const CORNERS: readonly Corner[] = ['nw', 'ne', 'sw', 'se']

/** The smallest a picture may be made (px). */
export const MIN_PICTURE_WIDTH = 64

/**
 * The new width after a corner is dragged by (dx, dy) px. Dragging away from
 * the picture's centre makes it bigger. Only the stronger of the two moves
 * counts, so a diagonal drag does not run at double speed. A centred picture
 * grows on both sides, so it moves twice as fast as the finger.
 */
export function resizedWidth(
  initial: number,
  corner: Corner,
  dx: number,
  dy: number,
  max: number,
  centred = false,
): number {
  const sideways = (corner.endsWith('e') ? 1 : -1) * dx
  const vertical = (corner.startsWith('s') ? 1 : -1) * dy
  const move = Math.abs(sideways) >= Math.abs(vertical) ? sideways : vertical
  const next = initial + (centred ? move * 2 : move)
  const top = Math.max(MIN_PICTURE_WIDTH, max)
  return Math.round(Math.min(Math.max(next, MIN_PICTURE_WIDTH), top))
}
