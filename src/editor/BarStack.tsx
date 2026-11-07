import { Tip } from '../help/Help'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  freePos,
  freeTip,
  placeBar,
  posFromPixels,
  visibleBox,
  resetFreePos,
  ribbonFreePos,
  type Insets,
} from '../app/tools/freeBar'
import type { Place } from '../app/tools/toolbarState'
import { t } from '../i18n/t'
import { useKeyboardInset } from '../settings/deviceModeSettings'

/**
 * One group of bars at one place: docked at the top (in the page flow, sticky),
 * docked at the bottom (fixed, above the on-screen keyboard), or floating over
 * the page with a ⠿ handle to drag it. Bars that share a place are children of
 * the same stack, so they sit one above the other and never overlap. The free
 * stack is always clamped inside the visible screen (safe areas, keyboard).
 */

/** Safe-area insets in px (read through a probe element, once per call). */
function readInsets(): Insets {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;inset:0;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
    'env(safe-area-inset-bottom) env(safe-area-inset-left)'
  document.body.append(probe)
  const s = getComputedStyle(probe)
  const px = (v: string) => Number.parseFloat(v) || 0
  // A docked bar (the other one, when both show) is room the floating bar
  // keeps clear of, so the two never overlap.
  const root = getComputedStyle(document.documentElement)
  const insets = {
    top: px(s.paddingTop) + px(root.getPropertyValue('--dock-top')),
    right: px(s.paddingRight),
    bottom: px(s.paddingBottom) + px(root.getPropertyValue('--dock-bottom')),
    left: px(s.paddingLeft),
  }
  probe.remove()
  return insets
}

export function BarStack({
  place,
  kind,
  hidden,
  onFraction,
  children,
}: {
  place: Place
  /** Which bar's saved place a free stack uses (the short bar's if both). */
  kind: 'short' | 'ribbon'
  /** Kept in the layout but invisible (auto-hide); never for a free stack. */
  hidden?: boolean
  /** A free stack tells where it sits (0 top … 1 bottom): trays open up or down. */
  onFraction?: (fy: number) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inset = useKeyboardInset()
  const store = kind === 'ribbon' ? ribbonFreePos : freePos
  const saved = store.useValue()
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const [xy, setXy] = useState<{ x: number; y: number } | null>(null)
  const free = place === 'free'

  // The docked top stack shares its height (the sticky section chips sit under
  // it); the bottom stack shares its height (the page leaves room for it).
  useLayoutEffect(() => {
    const el = ref.current
    const root = document.documentElement
    if (!el || free) return
    const name = place === 'top' ? '--dock-top' : '--dock-bottom'
    const apply = () => root.style.setProperty(name, el.offsetHeight + 'px')
    apply()
    const watch = new ResizeObserver(apply)
    watch.observe(el)
    return () => {
      watch.disconnect()
      root.style.removeProperty(name)
    }
  }, [place, free])

  // Free: put the stack where it was saved, clamped into the visible screen;
  // again whenever the screen changes (resize, rotation, keyboard, scroll).
  const settle = useCallback(() => {
    const el = ref.current
    if (!el || !free) return
    const r = el.getBoundingClientRect()
    const size = { width: r.width, height: r.height }
    const at = placeBar(saved, size, visibleBox(), readInsets())
    setXy((old) =>
      old && Math.abs(old.x - at.x) < 0.5 && Math.abs(old.y - at.y) < 0.5
        ? old
        : at,
    )
  }, [free, saved])

  useLayoutEffect(() => {
    if (!free) return
    settle()
    const el = ref.current
    const watch = new ResizeObserver(settle)
    if (el) watch.observe(el)
    const vv = window.visualViewport
    vv?.addEventListener('resize', settle)
    vv?.addEventListener('scroll', settle)
    window.addEventListener('resize', settle)
    window.addEventListener('orientationchange', settle)
    window.addEventListener('scroll', settle, true)
    // A docked bar appearing, growing or going changes the room.
    const styles = new MutationObserver(settle)
    styles.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })
    return () => {
      watch.disconnect()
      styles.disconnect()
      vv?.removeEventListener('resize', settle)
      vv?.removeEventListener('scroll', settle)
      window.removeEventListener('resize', settle)
      window.removeEventListener('orientationchange', settle)
      window.removeEventListener('scroll', settle, true)
    }
  }, [free, settle])

  useEffect(() => {
    if (free) onFraction?.(saved.fy)
  }, [free, saved.fy, onFraction])

  // ---- Dragging by the handle (pen, finger or mouse) ----
  const grab = useRef({ dx: 0, dy: 0 })
  const move = (x: number, y: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const size = { width: r.width, height: r.height }
    // Held inside the screen while dragging (no snapping yet).
    const room = placeBar({ fx: 0, fy: 0 }, size, visibleBox(), readInsets())
    const far = placeBar({ fx: 1, fy: 1 }, size, visibleBox(), readInsets())
    setDrag({
      x: Math.min(far.x, Math.max(room.x, x)),
      y: Math.min(far.y, Math.max(room.y, y)),
    })
  }
  const drop = (x: number, y: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    store.set(
      posFromPixels(
        x,
        y,
        { width: r.width, height: r.height },
        visibleBox(),
        readInsets(),
      ),
    )
    setDrag(null)
  }
  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // A pointer the browser does not know (a simulated pen): carry on.
    }
    const r = el.getBoundingClientRect()
    grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    dragging.current = true
    freeTip.set(false)
  }
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return
    move(e.clientX - grab.current.dx, e.clientY - grab.current.dy)
  }
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return
    dragging.current = false
    drop(e.clientX - grab.current.dx, e.clientY - grab.current.dy)
  }
  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 64 : 16
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const delta = d[e.key]
    if (!delta || !ref.current) return
    e.preventDefault()
    const r = ref.current.getBoundingClientRect()
    drop(r.left + delta[0], r.top + delta[1])
  }

  // The "This bar now floats" tip goes away on a tap anywhere, Esc or a while.
  const tip = freeTip.useValue() && free
  useEffect(() => {
    if (!tip) return
    const off = () => freeTip.set(false)
    const timer = setTimeout(off, 12000)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') off()
    }
    document.addEventListener('pointerdown', off, true)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', off, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [tip])

  const bottom = place === 'bottom'
  const at = drag ?? xy
  const style: CSSProperties = free
    ? {
        left: at?.x ?? 8,
        top: at?.y ?? 8,
        width: 'min(760px, calc(100vw - 16px))',
        // Measured first, then shown: never a flash in the wrong place.
        visibility: at ? 'visible' : 'hidden',
      }
    : bottom
      ? {
          bottom: inset,
          paddingBottom: inset > 0 ? 0 : 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          visibility: hidden ? 'hidden' : 'visible',
        }
      : {
          visibility: hidden ? 'hidden' : 'visible',
        }
  const up = bottom || (free && saved.fy > 0.5)

  return (
    <div
      ref={ref}
      data-bar="docked"
      data-chrome
      data-placement={place}
      data-kind={kind}
      style={style}
      className={
        free
          ? 'fixed z-30'
          : bottom
            ? 'fixed inset-x-0 z-10 bg-bg pt-2'
            : 'relative bg-bg'
      }
    >
      {free ? (
        <div className="flex items-start gap-0.5">
          <Tip id="bar.handle" touchInfo={false} className="inline-flex">
            <button
              type="button"
              data-bar-handle
              data-pen-own
              aria-label={t('bar.move')}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={onHandleKey}
              onDoubleClick={resetFreePos}
              onMouseDown={(e) => e.preventDefault()}
              style={{ touchAction: 'none' }}
              className="mt-1.5 grid min-h-11 w-8 shrink-0 cursor-grab place-items-center rounded-xl border border-line bg-bg text-lg leading-none text-ink-soft shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_18px_rgba(0,0,0,0.07)] hover:text-ink active:cursor-grabbing"
            >
              <span aria-hidden>⠿</span>
            </button>
          </Tip>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        children
      )}
      {tip && (
        <div
          role="status"
          data-free-tip
          className={`absolute left-1 z-50 w-max max-w-[calc(100vw-32px)] rounded-xl bg-ink px-3 py-2 text-sm text-bg shadow-lg ${
            up ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
          }`}
        >
          {t('bar.floatTip')}
          <span
            aria-hidden
            className={`absolute left-3.5 size-3 rotate-45 bg-ink ${
              up ? '-bottom-1.5' : '-top-1.5'
            }`}
          />
        </div>
      )}
    </div>
  )
}
