import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n/t'
import {
  ARROW,
  BAR_W,
  OLD_ARROW,
  OLD_BAR_W,
  SHORT,
  barGeometry,
  dragTop,
  sheetTarget,
  trackJumpTop,
} from './scrollBarLogic'
import './ScrollBar.css'

const reduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * True when the scroller cannot be seen: it is moved (partly) off the screen
 * (a closed drawer) or another box is drawn over its middle (the pages panel
 * over the sidebar). A hidden bar draws nothing.
 */
function coveredBy(el: HTMLElement, r: DOMRect): boolean {
  if (r.width === 0 || r.height === 0) return false
  if (r.left < -1 || r.right > window.innerWidth + 1) return true
  const hit = document.elementFromPoint(
    r.left + r.width / 2,
    r.top + r.height / 2,
  )
  if (!!hit && !el.contains(hit) && !hit.contains(el)) return true
  // A panel, card or sheet drawn over any part of the bar's own column (the
  // tool bar's ⋯ tray or More card over the page's right edge) hides the
  // covered list's bar: one bar per edge (P1.1). Bars themselves are skipped.
  const col = { l: r.right - BAR_W, r: r.right, t: r.top, b: r.bottom }
  for (const n of Array.from(
    document.querySelectorAll<HTMLElement>(PANEL_OVER),
  )) {
    if (n.contains(el) || el.contains(n) || n.closest('.sbar, [data-static]'))
      continue
    if (n.dataset.state === 'closed') continue
    const q = n.getBoundingClientRect()
    if (q.width === 0 || q.height === 0) continue
    const cs = getComputedStyle(n)
    // Hidden, or let touches through (the toast layer): it covers nothing.
    if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue
    if (q.left < col.r && q.right > col.l && q.top < col.b && q.bottom > col.t)
      return true
  }
  return false
}

/** Boxes that, drawn over a list's bar column, cover that list (cards, sheets, trays, pop-ups). */
const PANEL_OVER =
  '.pcard, [popover], dialog, [role="dialog"], [data-bar="tray"], [data-popup]'

/**
 * The rounded corners at the scroller's right edge (its own or a panel's that
 * ends at the same edge), so the bar sits inside them, not over the curve.
 */
function cornersOf(el: HTMLElement, right: number) {
  let top = 0
  let bottom = 0
  for (let a: HTMLElement | null = el; a && a !== document.body;) {
    if (Math.abs(a.getBoundingClientRect().right - right) > 2) break
    const s = getComputedStyle(a)
    top = Math.max(top, parseFloat(s.borderTopRightRadius) || 0)
    bottom = Math.max(bottom, parseFloat(s.borderBottomRightRadius) || 0)
    a = a.parentElement
  }
  return { top, bottom }
}

/** The layer of the box the list lives in, so the bar is drawn above it. */
function layerOf(el: HTMLElement): 'card' | 'sheet' | 'tray' | undefined {
  if (el.closest('[data-bar="tray"]')) return 'tray'
  const card = el.closest<HTMLElement>('.pcard:not([data-static])')
  if (!card) return undefined
  return card.hasAttribute('data-phone') ? 'sheet' : 'card'
}

type Read = {
  rect: { right: number; top: number; height: number; width: number }
  /** Rounded corners at the right edge (px): the bar keeps clear of them. */
  inset: { top: number; bottom: number }
  /** Something else (a panel, a sheet) is drawn over the scroller, or it is off the screen. */
  covered: boolean
  scrollTop: number
  scrollH: number
  clientH: number
}

/**
 * The ONE scroll bar of the app (iPad test findings 14 Nov, F3 / F6): a visible
 * track, a draggable thumb sized to the content, and an arrow at each end
 * (an arrow dims at its end, so the ends are visible). Used by the notebook
 * sidebar, the pages panel and the page itself. It sits in a gutter at the
 * scroller's right edge (`data-scrollbar` reserves it in ScrollBar.css) so it
 * never covers content. Pointer events: a finger, the Pencil and a mouse work.
 *
 * `scroller` is the element that scrolls (get it with `useScroller`). `stops`
 * (optional) returns the tops an arrow tap jumps to, e.g. the page's sheets;
 * without it an arrow moves nearly one window. `attr` names the test hooks
 * (`data-<attr>-root | track | thumb | arrow`).
 */
export function ScrollBar({
  scroller,
  stops,
  attr = 'scrollbar',
  labels,
  auto = false,
  legacy = false,
}: {
  scroller: HTMLElement | null
  stops?: (el: HTMLElement) => number[]
  attr?: string
  labels?: { up: string; down: string; bar: string }
  /** Found by the scroll hints (ScrollBarHost): the list stays in their care. */
  auto?: boolean
  /** The page's bar with the new app frame off: the old 24 px look, exactly. */
  legacy?: boolean
}) {
  const [state, setState] = useState<Read | null>(null)
  const drag = useRef<{ y: number; top: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const read = useCallback(() => {
    const el = scroller
    if (!el) return
    const r = el.getBoundingClientRect()
    const next: Read = {
      rect: { right: r.right, top: r.top, height: r.height, width: r.width },
      inset: legacy ? { top: 0, bottom: 0 } : cornersOf(el, r.right),
      covered: !legacy && coveredBy(el, r),
      scrollTop: el.scrollTop,
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    }
    setState((old) =>
      old &&
      old.rect.right === next.rect.right &&
      old.rect.top === next.rect.top &&
      old.rect.height === next.rect.height &&
      old.rect.width === next.rect.width &&
      old.inset.top === next.inset.top &&
      old.inset.bottom === next.inset.bottom &&
      old.covered === next.covered &&
      old.scrollTop === next.scrollTop &&
      old.scrollH === next.scrollH &&
      old.clientH === next.clientH
        ? old
        : next,
    )
  }, [scroller, legacy])

  useEffect(() => {
    const el = scroller
    if (!el) return
    // The old page bar keeps its own gutter (index.css `[data-pagebar]`).
    if (legacy) el.setAttribute('data-pagebar', '')
    // The shared bar replaces the fading hint handle on this list.
    else if (!auto) el.setAttribute('data-no-scroll-hint', '')
    const first = requestAnimationFrame(read)
    el.addEventListener('scroll', read, { passive: true })
    const ro = new ResizeObserver(read)
    ro.observe(el)
    for (const c of Array.from(el.children)) ro.observe(c)
    // Content that grows by itself: children are added or removed.
    const mo = new MutationObserver(read)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(first)
      el.removeEventListener('scroll', read)
      ro.disconnect()
      mo.disconnect()
      if (legacy) el.removeAttribute('data-pagebar')
      else if (!auto) el.removeAttribute('data-no-scroll-hint')
    }
  }, [scroller, auto, legacy, read])

  // Something drawn over the list (or taken away) leaves no trace inside it: look
  // again every 700 ms, but ONLY while the list overflows (the bar could show).
  const overflowing = !!state && state.scrollH - state.clientH > 1
  // The gutter is reserved only while the list overflows (a short card keeps
  // its full width); a list found by the scroll hints (auto) gets none: no jump.
  const gutter = !!scroller && !auto && !legacy && overflowing
  useEffect(() => {
    if (!scroller || !gutter) return
    scroller.setAttribute('data-scrollbar', '')
    return () => scroller.removeAttribute('data-scrollbar')
  }, [scroller, gutter])
  useEffect(() => {
    if (!scroller || !overflowing) return
    const poll = window.setInterval(read, 700)
    return () => window.clearInterval(poll)
  }, [scroller, overflowing, read])

  const jump = useCallback(
    (dir: 1 | -1) => {
      if (!scroller) return
      scroller.scrollTo({
        top: sheetTarget(
          scroller.scrollTop,
          stops ? stops(scroller) : [],
          dir,
          scroller.clientHeight,
          scroller.scrollHeight - scroller.clientHeight,
        ),
        behavior: reduced() ? 'auto' : 'smooth',
      })
    },
    [scroller, stops],
  )

  if (!scroller || !state || state.rect.width === 0 || state.covered)
    return null
  const barW = legacy ? OLD_BAR_W : BAR_W
  // Inside the rounded corners; a short list shows the thumb only (no arrows on its content).
  const height = state.rect.height - state.inset.top - state.inset.bottom
  const arrowH = legacy ? OLD_ARROW : height < SHORT ? 0 : ARROW
  const track = Math.max(0, height - arrowH * 2)
  const g = barGeometry(state.scrollTop, state.scrollH, state.clientH, track)
  if (!g) return null
  const max = state.scrollH - state.clientH
  const text = labels ?? {
    up: t('parts.scroll.up'),
    down: t('parts.scroll.down'),
    bar: t('parts.scroll.bar'),
  }
  const hook = (part: string, value = '') => ({
    [`data-${attr}-${part}`]: value,
  })

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test): the moves still arrive.
    }
    drag.current = { y: e.clientY, top: scroller.scrollTop }
    setDragging(true)
  }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const top = dragTop(
      d.top,
      e.clientY - d.y,
      state.scrollH,
      state.clientH,
      track,
      g.thumbH,
    )
    scroller.scrollTo({ top, behavior: 'instant' })
    // The thumb moves in the same frame as the finger, not a scroll event later.
    setState((old) => (old ? { ...old, scrollTop: top } : old))
  }
  const up = () => {
    drag.current = null
    setDragging(false)
  }
  /** A tap on the track jumps the thumb (centred) to the tapped spot; keep dragging from there. */
  const trackTap = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    e.preventDefault()
    e.stopPropagation()
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const top = trackJumpTop(y, state.scrollH, state.clientH, track, g.thumbH)
    scroller.scrollTo({ top, behavior: 'instant' })
    setState((old) => (old ? { ...old, scrollTop: top } : old))
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test): the moves still arrive.
    }
    drag.current = { y: e.clientY, top }
    setDragging(true)
  }

  const arrow = (dir: 1 | -1) =>
    arrowH > 0 && (
      <button
        type="button"
        {...hook('arrow', dir === 1 ? 'down' : 'up')}
        aria-label={dir === 1 ? text.down : text.up}
        disabled={dir === 1 ? state.scrollTop >= max - 1 : state.scrollTop <= 1}
        onClick={() => jump(dir)}
        className={
          legacy
            ? 'flex w-full items-center justify-center text-muted hover:text-ink disabled:opacity-30'
            : 'sbar__arrow'
        }
        style={{ height: arrowH, touchAction: 'manipulation' }}
      >
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden>
          <path
            d={dir === 1 ? 'M1 1.5l5 5 5-5' : 'M1 6.5l5-5 5 5'}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )

  return createPortal(
    <div
      data-chrome
      {...hook('root')}
      className={legacy ? 'sbar sbar--old' : 'sbar'}
      data-layer={legacy ? undefined : layerOf(scroller)}
      style={{
        left: state.rect.right - barW,
        top: state.rect.top + state.inset.top,
        width: barW,
        height,
      }}
    >
      {arrow(-1)}
      <div
        {...hook('track')}
        {...(legacy ? {} : { 'data-pen-native': '' })}
        onPointerDown={trackTap}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={
          legacy
            ? 'relative flex-1 rounded-full bg-hover/60'
            : `sbar__track${arrowH ? '' : ' sbar__track--short'}`
        }
        style={legacy ? { margin: '0 7px' } : undefined}
      >
        <div
          role="scrollbar"
          aria-orientation="vertical"
          aria-label={text.bar}
          aria-valuemin={0}
          aria-valuemax={Math.round(max)}
          aria-valuenow={Math.round(state.scrollTop)}
          tabIndex={0}
          {...hook('thumb')}
          {...(legacy ? {} : { 'data-pen-native': '' })}
          onPointerDown={down}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') jump(1)
            if (e.key === 'ArrowUp') jump(-1)
          }}
          className={
            legacy
              ? 'absolute inset-x-[-5px] rounded-full ' +
                (dragging ? 'bg-accent' : 'bg-muted/70')
              : `sbar__thumb${dragging ? ' sbar__thumb--drag' : ''}`
          }
          style={{ top: g.thumbTop, height: g.thumbH, touchAction: 'none' }}
        />
      </div>
      {arrow(1)}
    </div>,
    // A pop-over sits in the top layer: the bar must be inside it to show.
    (!legacy && scroller.closest<HTMLElement>('[popover], dialog[open]')) ||
      document.body,
  )
}

/**
 * The bar for a scroller that is found by `selector` inside `root` and may be
 * replaced as tabs change (the pages panel's tabs each draw their own list).
 */
export function ScrollBarIn({
  root,
  selector,
}: {
  root: HTMLElement | null
  selector: string
}) {
  const [found, setFound] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!root) return
    const find = () =>
      setFound((old) => {
        const next = root.querySelector<HTMLElement>(selector)
        return next === old ? old : next
      })
    find()
    const mo = new MutationObserver(find)
    mo.observe(root, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [root, selector])
  return <ScrollBar scroller={found} />
}
