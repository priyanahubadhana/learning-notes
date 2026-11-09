/**
 * Picture resize (G3): the maths behind dragging a corner handle. Pure, so
 * it is tested without a browser. Every number that comes in or goes out is
 * checked: a picture is never given a width that is 0, negative or NaN (the
 * 9 Nov "picture disappeared" bug).
 */

export type Corner = 'nw' | 'ne' | 'sw' | 'se'
export const CORNERS: readonly Corner[] = ['nw', 'ne', 'sw', 'se']

/** The smallest a picture may be made (px). */
export const MIN_PICTURE_WIDTH = 48

/** A usable width: a finite number above 0, else null. */
export function goodWidth(w: unknown): number | null {
  return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : null
}

/** `w` kept between the minimum and the room there is (never NaN). */
export function clampWidth(w: number, max: number): number {
  const top = Math.max(MIN_PICTURE_WIDTH, goodWidth(max) ?? 4000)
  const base = goodWidth(w) ?? MIN_PICTURE_WIDTH
  return Math.round(Math.min(Math.max(base, MIN_PICTURE_WIDTH), top))
}

/**
 * The width a drag starts from, read fresh at every pointer-down: the box,
 * else the picture, else its natural size. Null when nothing is measurable
 * (then no drag starts and nothing is saved).
 */
export function startWidth(
  ...candidates: (number | null | undefined)[]
): number | null {
  for (const c of candidates) {
    const w = goodWidth(c)
    if (w !== null) return w
  }
  return null
}

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
  const x = Number.isFinite(dx) ? dx : 0
  const y = Number.isFinite(dy) ? dy : 0
  const sideways = (corner.endsWith('e') ? 1 : -1) * x
  const vertical = (corner.startsWith('s') ? 1 : -1) * y
  const move = Math.abs(sideways) >= Math.abs(vertical) ? sideways : vertical
  return clampWidth(initial + (centred ? move * 2 : move), max)
}

export type SizePreset = 'smaller' | 'bigger' | 'fit' | 'natural'

/** The width a size preset gives ("smaller" is 40 % less). */
export function presetWidth(
  preset: SizePreset,
  current: number,
  room: number,
  natural: number,
): number {
  const base = goodWidth(current) ?? MIN_PICTURE_WIDTH
  if (preset === 'smaller') return clampWidth(base * 0.6, room)
  if (preset === 'bigger') return clampWidth(base * 1.5, room)
  if (preset === 'fit') return clampWidth(room, room)
  return clampWidth(goodWidth(natural) ?? base, room)
}

/** Ease-out for the 180 ms size animation. */
export const easeOut = (t: number): number => 1 - (1 - t) ** 3

/** Width at animation progress `t` (0..1). */
export const tween = (from: number, to: number, t: number): number =>
  from + (to - from) * easeOut(Math.min(1, Math.max(0, t)))

/**
 * Saved `previewWidth` values that are wrong (0, negative, NaN, text): the
 * block ids whose width should be dropped so the picture shows at its natural
 * size again (repair on load).
 */
export function badWidthIds(
  blocks: readonly { id: string; type: string; props?: unknown }[],
): string[] {
  const out: string[] = []
  for (const b of blocks) {
    if (b.type !== 'image') continue
    const w = (b.props as { previewWidth?: unknown } | undefined)?.previewWidth
    if (w === undefined || w === null) continue
    if (goodWidth(w) === null) out.push(b.id)
  }
  return out
}
