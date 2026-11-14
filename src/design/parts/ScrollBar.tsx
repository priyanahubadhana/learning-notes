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
  barGeometry,
  dragTop,
  sheetTarget,
  trackJumpTop,
} from './scrollBarLogic'
import './ScrollBar.css'

const reduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

type Read = {
  rect: { right: number; top: number; height: number; width: number }
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
}: {
  scroller: HTMLElement | null
  stops?: (el: HTMLElement) => number[]
  attr?: string
  labels?: { up: string; down: string; bar: string }
}) {
  const [state, setState] = useState<Read | null>(null)
  const drag = useRef<{ y: number; top: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const el = scroller
    if (!el) return
    el.setAttribute('data-scrollbar', '')
    // The shared bar replaces the fading hint handle on this list.
    el.setAttribute('data-no-scroll-hint', '')
    const read = () => {
      const r = el.getBoundingClientRect()
      const next: Read = {
        rect: { right: r.right, top: r.top, height: r.height, width: r.width },
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
        old.scrollTop === next.scrollTop &&
        old.scrollH === next.scrollH &&
        old.clientH === next.clientH
          ? old
          : next,
      )
    }
    const first = requestAnimationFrame(read)
    el.addEventListener('scroll', read, { passive: true })
    const ro = new ResizeObserver(read)
    ro.observe(el)
    for (const c of Array.from(el.children)) ro.observe(c)
    const poll = window.setInterval(read, 700) // content that grows by itself
    return () => {
      cancelAnimationFrame(first)
      el.removeEventListener('scroll', read)
      ro.disconnect()
      window.clearInterval(poll)
      el.removeAttribute('data-scrollbar')
      el.removeAttribute('data-no-scroll-hint')
    }
  }, [scroller])

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

  if (!scroller || !state || state.rect.width === 0) return null
  const track = Math.max(0, state.rect.height - ARROW * 2)
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
    scroller.scrollTop = top
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
    scroller.scrollTop = top
    setState((old) => (old ? { ...old, scrollTop: top } : old))
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test): the moves still arrive.
    }
    drag.current = { y: e.clientY, top }
    setDragging(true)
  }

  const arrow = (dir: 1 | -1) => (
    <button
      type="button"
      {...hook('arrow', dir === 1 ? 'down' : 'up')}
      aria-label={dir === 1 ? text.down : text.up}
      disabled={dir === 1 ? state.scrollTop >= max - 1 : state.scrollTop <= 1}
      onClick={() => jump(dir)}
      className="sbar__arrow"
      style={{ height: ARROW }}
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
      className="sbar"
      style={{
        left: state.rect.right - BAR_W,
        top: state.rect.top,
        width: BAR_W,
        height: state.rect.height,
      }}
    >
      {arrow(-1)}
      <div
        {...hook('track')}
        onPointerDown={trackTap}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="sbar__track"
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
          onPointerDown={down}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') jump(1)
            if (e.key === 'ArrowUp') jump(-1)
          }}
          className={`sbar__thumb${dragging ? ' sbar__thumb--drag' : ''}`}
          style={{ top: g.thumbTop, height: g.thumbH }}
        />
      </div>
      {arrow(1)}
    </div>,
    // A pop-over sits in the top layer: the bar must be inside it to show.
    scroller.closest<HTMLElement>('[popover]') ?? document.body,
  )
}

/** The scroller element as state, so its ScrollBar re-renders once it is attached: `const [node, ref] = useScroller()`. */
export function useScroller(): [
  HTMLElement | null,
  (el: HTMLElement | null) => void,
] {
  return useState<HTMLElement | null>(null)
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
