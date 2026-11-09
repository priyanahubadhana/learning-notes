/**
 * Resizing a picture must not fight the sheet-gap rule: while a drag is on,
 * pagination is held (the picture follows the finger every frame, nothing
 * jumps to the next sheet). On release the rule runs once and the move is
 * animated (slide, scroll to follow, pulse) so the user can track the picture.
 */
let held = 0
const releaseListeners = new Set<() => void>()

export const paginationHeld = (): boolean => held > 0

/** Holds pagination; the returned function lets go (and re-runs it). */
export function holdPagination(): () => void {
  held++
  let done = false
  return () => {
    if (done) return
    done = true
    held = Math.max(0, held - 1)
    if (held === 0) releaseListeners.forEach((fn) => fn())
  }
}

export function onPaginationRelease(fn: () => void): () => void {
  releaseListeners.add(fn)
  return () => {
    releaseListeners.delete(fn)
  }
}

/** Sheet margins in screen px (set by the paper frame each pass). */
export const sheetMetrics = { bottomMargin: 0, topMargin: 0 }

/** A block we watch across the next pagination pass. */
let tracked: { id: string; top: number; at: number } | null = null

/** Remember where a block is before the rule moves it. */
export function trackBlock(id: string): void {
  const el = document.querySelector<HTMLElement>(`.bn-block[data-id="${id}"]`)
  if (el) tracked = { id, top: el.getBoundingClientRect().top, at: Date.now() }
}

/** Where the picture's block would land if it were pushed (screen px), or null. */
export function ghostSpot(
  bottom: number,
  height: number,
): { top: number } | null {
  const sheets = Array.from(
    document.querySelectorAll<HTMLElement>('[data-paper-sheet]'),
  )
  for (let i = 0; i < sheets.length; i++) {
    const r = sheets[i].getBoundingClientRect()
    const end = r.bottom - sheetMetrics.bottomMargin
    if (bottom > r.top && bottom - height < end && bottom > end) {
      const next = sheets[i + 1]
      if (!next) return null
      return { top: next.getBoundingClientRect().top + sheetMetrics.topMargin }
    }
  }
  return null
}

const reduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * After a pagination pass: if the tracked block moved a long way, slide it
 * from where it was (200 ms), scroll to follow it and pulse it.
 */
export function playTrackedMove(scroller: HTMLElement | null): void {
  const t = tracked
  if (!t) return
  const el = document.querySelector<HTMLElement>(`.bn-block[data-id="${t.id}"]`)
  if (!el) return
  const delta = t.top - el.getBoundingClientRect().top
  if (Math.abs(delta) < 40) {
    // Not moved yet (the page may still be redrawing): look again soon.
    if (Date.now() - t.at > 800) tracked = null
    return
  }
  tracked = null
  // Follow it: keep it in view.
  if (scroller) {
    const r = el.getBoundingClientRect()
    const s = scroller.getBoundingClientRect()
    const want = r.top - s.top - s.height * 0.25
    if (r.top < s.top || r.bottom > s.bottom) {
      scroller.scrollBy({
        top: want,
        behavior: reduced() ? 'auto' : 'smooth',
      })
    }
  }
  el.setAttribute('data-moved', '')
  window.setTimeout(() => el.removeAttribute('data-moved'), 1400)
  if (reduced()) return
  el.animate(
    [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
    { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  )
}
