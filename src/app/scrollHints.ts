/**
 * Scroll hints (R5-13): on any list that scrolls up and down,
 *  - a soft fade at the top and/or bottom edge when more content is hidden
 *    (CSS in index.css reads `data-scroll-more="top|bottom|both"`), and
 *  - one slim indicator that shows while scrolling or on touch and fades
 *    after about a second.
 * No page code needs to know: one listener on the document does it all.
 * Off by switch (Settings › Scroll hints): the marks are removed.
 */

/** How long the indicator stays after the last scroll or touch (ms). */
const HIDE_MS = 1000
/** Smallest indicator height (px), so it stays easy to see. */
const MIN_THUMB = 28
/** Width of the handle's own gutter and touch area (px). */
const HIT = 24
/** Edge gap of the indicator (px). */
const INSET = 3

import { installEdgeStretch } from './edgeStretch'

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

function mark(el: HTMLElement): void {
  const more = moreOf(el.scrollTop, el.scrollHeight, el.clientHeight)
  if (more) el.setAttribute(MARK, more)
  else el.removeAttribute(MARK)
}

/**
 * Starts the hints. `isOn` is read each time, so the Settings switch takes
 * effect at once; call the returned `refresh` when it changes.
 */
export function installScrollHints(isOn: () => boolean): {
  refresh: () => void
  stop: () => void
} {
  const thumb = document.createElement('div')
  thumb.className = 'scroll-hint-thumb'
  thumb.setAttribute('aria-hidden', 'true')
  thumb.dataset.noScrollHint = ''
  document.body.appendChild(thumb)
  const stopStretch = installEdgeStretch()

  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let scanTimer: ReturnType<typeof setTimeout> | undefined

  let current: HTMLElement | null = null
  let drag: { y: number; top: number; height: number } | null = null
  let hovered = false

  const hide = () => {
    if (drag || hovered) return
    thumb.classList.remove('is-on')
  }
  const later = () => {
    clearTimeout(hideTimer)
    hideTimer = setTimeout(hide, HIDE_MS)
  }

  const show = (el: HTMLElement) => {
    const g = thumbOf(el.scrollTop, el.scrollHeight, el.clientHeight)
    if (!g) {
      current = null
      return hide()
    }
    current = el
    const box = el.getBoundingClientRect()
    thumb.style.top = `${box.top + el.clientTop + g.top}px`
    thumb.style.height = `${g.height}px`
    // The hit area is 24 px wide and ends at the list's right edge.
    thumb.style.left = `${box.right - el.clientLeft - HIT}px`
    thumb.classList.add('is-on')
    if (!drag) later()
  }

  // The handle: drag it and the content follows 1:1.
  thumb.addEventListener('pointerdown', (e) => {
    if (!current) return
    e.preventDefault()
    e.stopPropagation()
    try {
      thumb.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test): move and up still arrive.
    }
    drag = {
      y: e.clientY,
      top: current.scrollTop,
      height: thumb.getBoundingClientRect().height,
    }
    thumb.classList.add('is-drag')
    clearTimeout(hideTimer)
  })
  thumb.addEventListener('pointermove', (e) => {
    if (!drag || !current) return
    current.scrollTop = dragScrollTop(
      drag.top,
      e.clientY - drag.y,
      current.scrollHeight,
      current.clientHeight,
      drag.height,
    )
  })
  const endDrag = () => {
    if (!drag) return
    drag = null
    thumb.classList.remove('is-drag')
    later()
  }
  thumb.addEventListener('pointerup', endDrag)
  thumb.addEventListener('pointercancel', endDrag)
  thumb.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return
    hovered = true
    clearTimeout(hideTimer)
  })
  thumb.addEventListener('pointerleave', () => {
    hovered = false
    later()
  })
  // A mouse over a list shows the handle (touch: on scroll or touch).
  const over = (event: PointerEvent) => {
    if (!isOn() || event.pointerType !== 'mouse' || drag) return
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
    if (drag && el !== current) return
    mark(el)
    show(el)
  }

  /** Marks every list that already overflows (fade before any touch). */
  const scan = () => {
    scanTimer = undefined
    const all = document.querySelectorAll<HTMLElement>(
      `[${MARK}], div, nav, aside, ul, section`,
    )
    const limit = Math.min(all.length, 4000)
    for (let i = 0; i < limit; i++) {
      const el = all[i]
      if (!isOn()) {
        el.removeAttribute(MARK)
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
  // A list that leaves the page (a closed menu) takes its handle along at once,
  // so a stale handle never sits over what is now under it.
  const dropIfGone = () => {
    if (
      current &&
      !drag &&
      (!current.isConnected || current.getClientRects().length === 0)
    ) {
      current = null
      hovered = false
      thumb.classList.remove('is-on')
    }
  }
  const observer = new MutationObserver(() => {
    dropIfGone()
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
      clearTimeout(hideTimer)
      clearTimeout(scanTimer)
      thumb.remove()
    },
  }
}
