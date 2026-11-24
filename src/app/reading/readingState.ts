import { memStore } from '../tools/store'

/**
 * Whether Reading mode is on, and in which way:
 * - `inPlace`: the open page itself, with the Read tool set on the bar;
 * - `reader`: a full-screen reader that hides everything else (like Kindle).
 * It lives only while the app is open. `locked` ("Lock to reading") stops
 * editing and makes leaving Reading mode need one more tap.
 */

export type ReadingView = 'off' | 'inPlace' | 'reader'

export const readingView = memStore<ReadingView>('off')
export const readingLocked = memStore(false)
/** Reading was turned on by a page or notebook set to "always open in Reading". */
export const readingAuto = memStore(false)

export const isReading = (): boolean => readingView.get() !== 'off'

export function startReading(view: Exclude<ReadingView, 'off'>, auto = false) {
  readingAuto.set(auto)
  readingView.set(view)
}

/** Leaves Reading mode. Returns false when "Lock to reading" is on. */
export function stopReading(): boolean {
  if (readingLocked.get()) return false
  readingAuto.set(false)
  readingView.set('off')
  return true
}

let pagesOpen = 0
/**
 * A page screen opened (call the returned function when it closes). Reading
 * mode ends with the last page screen; a next page opening in its place (same
 * tick) keeps it. "Lock to reading" is still respected.
 */
export function pageOpened(): () => void {
  pagesOpen++
  return () => {
    pagesOpen--
    setTimeout(() => {
      if (pagesOpen === 0 && isReading()) stopReading()
    }, 0)
  }
}

/** Tests only. */
export function resetReadingState(): void {
  readingView.set('off')
  readingLocked.set(false)
  readingAuto.set(false)
}
