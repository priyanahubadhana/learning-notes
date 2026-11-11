import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react'

/**
 * One drag gesture for rows, chips and handles, for mouse, Apple Pencil /
 * pen and finger:
 *  - "handle": a grip with `touch-action: none`; any pointer picks it up
 *    after a few pixels.
 *  - "hold": a chip inside scrolling content; mouse and pen pick it up after
 *    a few pixels, a finger after holding it (moving sooner scrolls). On
 *    iPad the Pencil also sends touch events, which keep coming where
 *    pointer events are cancelled for scrolling, so they are used for it.
 * While dragging near the top or bottom edge the page (or its scroller)
 * scrolls. Escape cancels. The screen decides what the drag means.
 */

export interface GestureHooks {
  /** A press became a drag; return false to refuse it. */
  start: (id: string, x: number, y: number, el: HTMLElement) => boolean
  move: (x: number, y: number) => void
  /** The drag ended: `commit` is false when it was cancelled. */
  end: (commit: boolean) => void
}

type Kind = 'mouse' | 'pen' | 'touch' | 'stylus'

const SLOP = 5
const HANDLE_SLOP = 3
const TOUCH_SLOP = 8
const TOUCH_HOLD = 350
const EDGE = 56
const MAX_SPEED = 18

/** The element that scrolls `el` up and down (null = the window). */
function scroller(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflow = getComputedStyle(p).overflowY
    if (
      (overflow === 'auto' || overflow === 'scroll') &&
      p.scrollHeight > p.clientHeight + 1
    ) {
      return p
    }
  }
  return null
}

interface Press {
  id: string
  el: HTMLElement
  x: number
  y: number
  dragging: boolean
  timer?: number
  scroll?: number
  lastX: number
  lastY: number
}

export function useDragGesture(hooks: GestureHooks, mode: 'handle' | 'hold') {
  const latest = useRef(hooks)
  useEffect(() => {
    latest.current = hooks
  })
  const press = useRef<Press | null>(null)
  const off = useRef<(() => void) | null>(null)
  const suppress = useRef(false)

  /** Ends the press: timers and document listeners go. */
  const stop = useCallback(() => {
    const p = press.current
    if (p?.timer) window.clearTimeout(p.timer)
    if (p?.scroll) window.clearInterval(p.scroll)
    press.current = null
    off.current?.()
    off.current = null
  }, [])

  // A drag still running when the screen goes away is cancelled.
  useEffect(
    () => () => {
      const dragging = press.current?.dragging
      stop()
      if (dragging) latest.current.end(false)
    },
    [stop],
  )

  const begin = useCallback(
    (kind: Kind, id: string, el: HTMLElement, x: number, y: number) => {
      stop()
      const p: Press = { id, el, x, y, dragging: false, lastX: x, lastY: y }
      press.current = p
      const waits = kind === 'touch' // a finger on a chip: hold to pick up
      const slop = waits ? TOUCH_SLOP : mode === 'handle' ? HANDLE_SLOP : SLOP

      const pickUp = (px: number, py: number) => {
        if (p.dragging || press.current !== p) return
        if (!latest.current.start(id, px, py, el)) {
          stop()
          return
        }
        p.dragging = true
        p.lastX = px
        p.lastY = py
        const parent = scroller(el)
        p.scroll = window.setInterval(() => {
          const top = parent ? parent.getBoundingClientRect().top : 0
          const bottom = parent
            ? parent.getBoundingClientRect().bottom
            : window.innerHeight
          const speed =
            p.lastY < top + EDGE
              ? -Math.min(1, (top + EDGE - p.lastY) / EDGE)
              : p.lastY > bottom - EDGE
                ? Math.min(1, (p.lastY - (bottom - EDGE)) / EDGE)
                : 0
          if (speed === 0) return
          const by = Math.round(speed * MAX_SPEED)
          if (parent) parent.scrollTop += by
          else window.scrollBy(0, by)
          latest.current.move(p.lastX, p.lastY) // the target moved under it
        }, 16)
      }
      if (waits) {
        p.timer = window.setTimeout(() => pickUp(x, y), TOUCH_HOLD)
      }

      /** True while dragging (the move is used up). */
      const move = (mx: number, my: number): boolean => {
        if (!p.dragging) {
          const moved = Math.hypot(mx - x, my - y)
          if (waits) {
            if (moved > slop) stop() // a scroll, not a drag
            return false
          }
          if (moved > slop) pickUp(mx, my)
          if (!p.dragging) return false
        }
        p.lastX = mx
        p.lastY = my
        latest.current.move(mx, my)
        return true
      }
      const finish = (commit: boolean) => {
        const was = p.dragging
        stop()
        if (!was) return
        // The release must not also "click" what was picked up.
        suppress.current = true
        window.setTimeout(() => (suppress.current = false), 400)
        latest.current.end(commit)
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && p.dragging) {
          e.preventDefault()
          e.stopPropagation()
          finish(false)
        }
      }

      const entries: [string, EventListener, AddEventListenerOptions?][] =
        kind === 'touch' || kind === 'stylus'
          ? [
              [
                'touchmove',
                ((e: TouchEvent) => {
                  const t = e.touches[0]
                  if (t && move(t.clientX, t.clientY) && e.cancelable) {
                    e.preventDefault()
                  }
                }) as EventListener,
                { passive: false },
              ],
              ['touchend', () => finish(true)],
              ['touchcancel', () => finish(false)],
            ]
          : [
              [
                'pointermove',
                ((e: PointerEvent) =>
                  void move(e.clientX, e.clientY)) as EventListener,
              ],
              ['pointerup', () => finish(true)],
              ['pointercancel', () => finish(false)],
            ]
      entries.push(['keydown', onKey as EventListener, { capture: true }])
      for (const [type, fn, options] of entries) {
        document.addEventListener(type, fn, options)
      }
      off.current = () => {
        for (const [type, fn, options] of entries) {
          document.removeEventListener(type, fn, options)
        }
      }
    },
    [mode, stop],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>, id: string) => {
      if (e.button !== 0 || press.current?.dragging) return
      // A finger on a chip uses touch events (see onTouchStart).
      if (e.pointerType === 'touch' && mode === 'hold') return
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return
      begin(
        e.pointerType === 'pen' || e.pointerType === 'touch' ? 'pen' : 'mouse',
        id,
        e.currentTarget,
        e.clientX,
        e.clientY,
      )
    },
    [begin, mode],
  )

  const onTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLElement>, id: string) => {
      if (mode !== 'hold' || e.touches.length !== 1) return
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return
      const t = e.touches[0]
      const stylus =
        (t as unknown as { touchType?: string }).touchType === 'stylus'
      begin(
        stylus ? 'stylus' : 'touch',
        id,
        e.currentTarget,
        t.clientX,
        t.clientY,
      )
    },
    [begin, mode],
  )

  /** True once after a drag ended: the click that follows must be ignored. */
  const consumeClick = useCallback(() => {
    const was = suppress.current
    suppress.current = false
    return was
  }, [])

  return { onPointerDown, onTouchStart, consumeClick }
}
