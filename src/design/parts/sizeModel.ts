/** Size: any whole number between these (px); 16 is the normal text size. */
export const SIZE_MIN = 6
export const SIZE_MAX = 200
export const SIZE_NORMAL = 16
/** The slider's far end (the number field goes on to SIZE_MAX). */
export const SLIDER_MAX = 96

export function clampSize(n: number): number {
  if (!Number.isFinite(n)) return SIZE_NORMAL
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(n)))
}
/** The − and + buttons move one step. */
export const stepSize = (n: number, dir: 1 | -1): number => clampSize(n + dir)
