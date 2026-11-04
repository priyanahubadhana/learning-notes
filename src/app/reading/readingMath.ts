/** Small pure helpers of Reading mode (tested in readingMath.test.ts). */

/** Average reading speed used for "about N min left" (words per minute). */
export const WORDS_PER_MINUTE = 220

export const countWords = (text: string): number =>
  text.trim() === '' ? 0 : text.trim().split(/\s+/).length

/** Whole minutes left (at least 1 while anything is left, 0 at the end). */
export function minutesLeft(totalWords: number, progress: number): number {
  const left = Math.max(0, totalWords * (1 - clamp01(progress)))
  if (left < 1) return 0
  return Math.max(1, Math.round(left / WORDS_PER_MINUTE))
}

export const clamp01 = (n: number): number =>
  Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0

/** Scroll position → progress (0 to 1). */
export function scrollProgress(
  top: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const room = scrollHeight - clientHeight
  return room <= 0 ? 1 : clamp01(top / room)
}

/** Paged position → progress (first page 0, last page 1). */
export function pagedProgress(index: number, count: number): number {
  return count <= 1 ? 1 : clamp01(index / (count - 1))
}

export function pageCount(scrollWidth: number, step: number): number {
  return step <= 0 ? 1 : Math.max(1, Math.round(scrollWidth / step))
}

/** Keeps a page index inside the book. */
export const clampPage = (index: number, count: number): number =>
  Math.min(Math.max(0, Math.round(index)), Math.max(0, count - 1))

/** What a tap does in the reader: edges turn pages, the middle shows the controls. */
export type TapZone = 'previous' | 'middle' | 'next'
export function tapZone(x: number, width: number): TapZone {
  if (width <= 0) return 'middle'
  const at = x / width
  return at < 0.25 ? 'previous' : at > 0.75 ? 'next' : 'middle'
}

/** A swipe is mostly sideways and long enough. */
export function swipeDirection(
  dx: number,
  dy: number,
  min = 40,
): 'previous' | 'next' | null {
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.5) return null
  return dx < 0 ? 'next' : 'previous'
}
