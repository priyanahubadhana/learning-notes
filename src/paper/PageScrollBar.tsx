import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/t'
import { ARROW, BAR_W, barGeometry, dragTop, sheetTarget } from './pageBar'

const reduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

type Read = {
  rect: { right: number; top: number; height: number }
  scrollTop: number
  scrollH: number
  clientH: number
}

/**
 * A proper scroll bar for paper pages (item 7): a visible track, a draggable
 * thumb sized to the page, and up / down arrows that move one sheet per tap.
 * It sits in a gutter reserved at the scroller's right edge (`data-pagebar`
 * adds the padding in index.css), so it never covers the paper. Pointer
 * events: a finger, the Pencil and a mouse all work.
 */
export function PageScrollBar({ sheetsKey }: { sheetsKey: number }) {
  const sc = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<Read | null>(null)
  const drag = useRef<{ y: number; top: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-page-scroller]')
    sc.current = el
    if (!el) return
    el.setAttribute('data-pagebar', '')
    const read = () => {
      const r = el.getBoundingClientRect()
      const next: Read = {
        rect: { right: r.right, top: r.top, height: r.height },
        scrollTop: el.scrollTop,
        scrollH: el.scrollHeight,
        clientH: el.clientHeight,
      }
      setState((old) =>
        old &&
        old.rect.right === next.rect.right &&
        old.rect.top === next.rect.top &&
        old.rect.height === next.rect.height &&
        old.scrollTop === next.scrollTop &&
        old.scrollH === next.scrollH &&
        old.clientH === next.clientH
          ? old
          : next,
      )
    }
    const first = requestAnimationFrame(read)
    el.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    const ro = new ResizeObserver(read)
    ro.observe(el)
    for (const c of Array.from(el.children)) ro.observe(c)
    const poll = window.setInterval(read, 700) // content that grows by itself
    return () => {
      cancelAnimationFrame(first)
      el.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
      ro.disconnect()
      window.clearInterval(poll)
      el.removeAttribute('data-pagebar')
    }
  }, [sheetsKey])

  if (!state) return null
  const track = Math.max(0, state.rect.height - ARROW * 2)
  const g = barGeometry(state.scrollTop, state.scrollH, state.clientH, track)
  if (!g) return null
  const max = state.scrollH - state.clientH

  const sheetTops = (el: HTMLElement) => {
    const base = el.getBoundingClientRect().top - el.scrollTop
    // Sheet tops with a little air above; the first one is the page start.
    return Array.from(
      el.querySelectorAll<HTMLElement>('[data-paper-sheet]'),
    ).map((s, i) =>
      i === 0 ? 0 : Math.max(0, s.getBoundingClientRect().top - base - 16),
    )
  }
  const go = (dir: 1 | -1) => {
    const el = sc.current
    if (!el) return
    el.scrollTo({
      top: sheetTarget(el.scrollTop, sheetTops(el), dir, state.clientH, max),
      behavior: reduced() ? 'auto' : 'smooth',
    })
  }

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test): the moves still arrive.
    }
    drag.current = { y: e.clientY, top: sc.current?.scrollTop ?? 0 }
    setDragging(true)
  }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = sc.current
    if (!d || !el) return
    el.scrollTop = dragTop(
      d.top,
      e.clientY - d.y,
      state.scrollH,
      state.clientH,
      track,
      g.thumbH,
    )
  }
  const up = () => {
    drag.current = null
    setDragging(false)
  }
  const trackTap = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const y = e.clientY - state.rect.top - ARROW
    go(y < g.thumbTop ? -1 : 1)
  }

  const arrow = (dir: 1 | -1) => (
    <button
      type="button"
      data-pagebar-arrow={dir === 1 ? 'down' : 'up'}
      aria-label={t(dir === 1 ? 'paper.scroll.down' : 'paper.scroll.up')}
      disabled={dir === 1 ? state.scrollTop >= max - 1 : state.scrollTop <= 1}
      onClick={() => go(dir)}
      className="flex w-full items-center justify-center text-muted hover:text-ink disabled:opacity-30"
      style={{ height: ARROW, touchAction: 'manipulation' }}
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
      data-pagebar-root
      style={{
        position: 'fixed',
        left: state.rect.right - BAR_W,
        top: state.rect.top,
        width: BAR_W,
        height: state.rect.height,
        zIndex: 'var(--z-bar)' as unknown as number,
        touchAction: 'none',
      }}
      className="flex flex-col"
    >
      {arrow(-1)}
      <div
        data-pagebar-track
        onPointerDown={trackTap}
        className="relative flex-1 rounded-full bg-hover/60"
        style={{ margin: '0 7px' }}
      >
        <div
          role="scrollbar"
          aria-orientation="vertical"
          aria-label={t('paper.scroll.bar')}
          aria-valuemin={0}
          aria-valuemax={Math.round(max)}
          aria-valuenow={Math.round(state.scrollTop)}
          tabIndex={0}
          data-pagebar-thumb
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') go(1)
            if (e.key === 'ArrowUp') go(-1)
          }}
          className={
            'absolute inset-x-[-5px] rounded-full ' +
            (dragging ? 'bg-accent' : 'bg-muted/70')
          }
          style={{ top: g.thumbTop, height: g.thumbH, touchAction: 'none' }}
        />
      </div>
      {arrow(1)}
    </div>,
    document.body,
  )
}
