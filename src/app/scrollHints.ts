/**
 * Scroll hints (R5-13): on any list that scrolls up and down,
 *  - a soft fade at the top and/or bottom edge when more content is hidden
 *    (CSS in index.css reads `data-scroll-more="top|bottom|both"`), and
 *  - one slim indicator that shows while scrolling or on touch and fades
 *    after about a second.
 * No page code needs to know: one listener on the document does it all.
 * Off by switch (Settings › Scroll hints): the marks are removed.
 */

/** Smallest indicator height (px), so it stays easy to see. */
const MIN_THUMB = 28
/** Edge gap of the indicator (px). */
const INSET = 3

import { installEdgeStretch } from './edgeStretch'
import { setScrollTarget } from '../design/parts/scrollTarget'

export type More = 'top' | 'bottom' | 'both' | null

/** Which edges hide more content. Pure. */
export function moreOf(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): More {
  if (scrollHeight - clientHeight <= 1) return null
  const above = scrollTop > 1
  const below = scrollTop + clientHeight < scrollHeight - 1
  if (above && below) return 'both'
  if (above) return 'top'
  if (below) return 'bottom'
  return null
}

/** Where the indicator sits inside a track of `clientHeight`. Pure. */
export function thumbOf(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): { top: number; height: number } | null {
  if (scrollHeight - clientHeight <= 1 || clientHeight <= 0) return null
  const track = clientHeight - INSET * 2
  const height = Math.min(
    track,
    Math.max(MIN_THUMB, (clientHeight / scrollHeight) * track),
  )
  const range = scrollHeight - clientHeight
  const ratio = Math.min(1, Math.max(0, scrollTop / range))
  return { top: INSET + ratio * (track - height), height }
}

/**
 * Pure: the scrollTop for a handle dragged `dy` px from where it was grabbed.
 * The thumb travels `clientHeight - 2 * INSET - thumbHeight` px while the
 * content travels `scrollHeight - clientHeight` px, so the ratio is exact
 * (the thumb stays under the finger) and both ends meet. Clamped.
 */
export function dragScrollTop(
  startScrollTop: number,
  dy: number,
  scrollHeight: number,
  clientHeight: number,
  thumbHeight: number,
): number {
  const range = scrollHeight - clientHeight
  const travel = clientHeight - INSET * 2 - thumbHeight
  if (range <= 0 || travel <= 0) return startScrollTop
  return Math.min(range, Math.max(0, startScrollTop + (dy * range) / travel))
}

/** True for a box that scrolls up and down by itself. */
function scrolls(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el === document.body || el === document.documentElement) return false
  if (el.scrollHeight - el.clientHeight <= 1) return false
  const overflow = getComputedStyle(el).overflowY
  if (overflow !== 'auto' && overflow !== 'scroll') return false
  // Never on the page itself (text, drawings): only on lists and panels.
  if (el.hasAttribute('data-no-scroll-hint')) return false
  // The page's own scroller holds pop-up menus and the editor: a mask there
  // changes how they stack and receive taps (the dashboard e2e test caught it).
  if (el.hasAttribute('data-page-scroller')) return false
  if (el.querySelector('.bn-editor, canvas, [data-app-shell]')) return false
  return true
}

/** The nearest box around `from` that scrolls (or null). */
function scrollerOf(from: EventTarget | null): HTMLElement | null {
  let el = from instanceof Element ? from : null
  while (el) {
    if (scrolls(el)) return el as HTMLElement
    el = el.parentElement
  }
  return null
}

const MARK = 'data-scroll-more'
/**
 * The handle's 24 px gutter. Once a list has had the handle it keeps the
 * gutter, even when it stops overflowing: dropping it would slide every row
 * 24 px sideways a moment after a row was removed, under the next tap.
 */
const GUTTER = 'data-scroll-gutter'

function mark(el: HTMLElement): void {
  const more = moreOf(el.scrollTop, el.scrollHeight, el.clientHeight)
  if (more) {
    el.setAttribute(MARK, more)
    el.setAttribute(GUTTER, '')
  } else el.removeAttribute(MARK)
}

/**
 * Starts the hints. `isOn` is read each time, so the Settings switch takes
 * effect at once; call the returned `refresh` when it changes. The slim handle
 * of old is gone: the list being scrolled gets the shared scroll bar
 * (design/parts/ScrollBar, mounted once as ScrollBarHost).
 */
export function installScrollHints(isOn: () => boolean): {
  refresh: () => void
  stop: () => void
} {
  const stopStretch = installEdgeStretch()
  let scanTimer: ReturnType<typeof setTimeout> | undefined
  let current: HTMLElement | null = null

  const show = (el: HTMLElement) => {
    current = el
    setScrollTarget(el)
  }
  const hide = () => {
    current = null
    setScrollTarget(null)
  }

  // A mouse over a list shows its bar (touch: on scroll or touch).
  const over = (event: PointerEvent) => {
    if (!isOn() || event.pointerType !== 'mouse') return
    const el = scrollerOf(event.target)
    if (el && el !== current) {
      mark(el)
      show(el)
    }
  }
  const touch = (event: Event) => {
    if (!isOn()) return
    const el = scrollerOf(event.target)
    if (!el) return
    mark(el)
    show(el)
  }
  const onScroll = (event: Event) => {
    if (!isOn()) return
    const el = event.target
    if (!(el instanceof HTMLElement) || !scrolls(el)) return
    mark(el)
    show(el)
  }

  /** Marks every list that already overflows (fade before any touch). */
  const scan = () => {
    scanTimer = undefined
    const all = document.querySelectorAll<HTMLElement>(
      `[${MARK}], [${GUTTER}], div, nav, aside, ul, section`,
    )
    const limit = Math.min(all.length, 4000)
    for (let i = 0; i < limit; i++) {
      const el = all[i]
      if (!isOn()) {
        el.removeAttribute(MARK)
        el.removeAttribute(GUTTER)
      } else if (el.scrollHeight - el.clientHeight > 1 && scrolls(el)) {
        mark(el)
      } else {
        el.removeAttribute(MARK)
      }
    }
    if (!isOn()) hide()
  }
  const soon = () => {
    if (scanTimer === undefined) scanTimer = setTimeout(scan, 400)
  }

  document.addEventListener('scroll', onScroll, {
    capture: true,
    passive: true,
  })
  document.addEventListener('pointerdown', touch, {
    capture: true,
    passive: true,
  })
  document.addEventListener('pointerover', over, {
    capture: true,
    passive: true,
  })
  document.addEventListener('touchstart', touch, {
    capture: true,
    passive: true,
  })
  window.addEventListener('resize', soon)
  // A list that leaves the page (a closed menu) takes its bar along at once.
  const observer = new MutationObserver(() => {
    if (
      current &&
      (!current.isConnected || current.getClientRects().length === 0)
    )
      hide()
    soon()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  soon()

  return {
    refresh: soon,
    stop: () => {
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('pointerdown', touch, true)
      document.removeEventListener('pointerover', over, true)
      document.removeEventListener('touchstart', touch, true)
      stopStretch()
      window.removeEventListener('resize', soon)
      observer.disconnect()
      clearTimeout(scanTimer)
      hide()
    },
  }
}
