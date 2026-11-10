import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { t } from '../../i18n/t'
import { Icon } from './icons'
import {
  NONE,
  measureOverflow,
  scrollForPointer,
  type Overflow,
} from './overflowMath'

/**
 * A bar that scrolls sideways (R7-14, R7-17). When it overflows:
 *  - the edge with more beyond it fades, with a chevron and a count of the
 *    tools out of sight ("more this way"); tapping the chevron slides the bar;
 *  - a thin track under the bar has a handle that a finger, the Pencil or a
 *    mouse can drag to slide the bar. The track is not a tool: dragging it
 *    never activates one. Nothing shows while the bar fits.
 */

export function BarScroll({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [o, setO] = useState<Overflow>(NONE)

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const edges = [...el.children].map((c) => ({
      left: (c as HTMLElement).offsetLeft - el.offsetLeft,
      right:
        (c as HTMLElement).offsetLeft -
        el.offsetLeft +
        (c as HTMLElement).offsetWidth,
    }))
    const next = measureOverflow(
      el.scrollLeft,
      el.clientWidth,
      el.scrollWidth,
      edges,
    )
    setO((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next))
  }, [])

  useEffect(() => {
    measure()
    const el = scroller.current
    if (!el) return
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    for (const child of el.children) watch.observe(child)
    return () => watch.disconnect()
  }, [measure, children])

  // The mouse wheel scrolls the bar sideways (bug batch 1, item 49).
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY))
        return
      if (el.scrollWidth <= el.clientWidth + 2) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  const slide = (direction: 1 | -1) =>
    scroller.current?.scrollBy({
      left: direction * (scroller.current.clientWidth * 0.7),
      behavior: 'smooth',
    })

  // ---- The handle: drag it, or press the track to jump there ----
  const dragging = useRef(false)
  const toPointer = (e: PointerEvent) => {
    const el = scroller.current
    const box = track.current?.getBoundingClientRect()
    if (!el || !box || !o.thumb) return
    el.scrollLeft = scrollForPointer(
      (e.clientX - box.left) / box.width,
      o.thumb.width,
      el.scrollWidth - el.clientWidth,
    )
  }

  const fade = 28
  const mask =
    o.start || o.end
      ? `linear-gradient(to right, ${o.start ? 'transparent' : '#000'} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${o.end ? 'transparent' : '#000'} 100%)`
      : undefined
  const cue =
    'absolute top-0 z-[1] grid h-full min-w-8 place-items-center text-ink-soft hover:text-ink'
  return (
    <div
      data-bar-scroll
      data-overflow={o.start || o.end || undefined}
      className={`relative min-w-0 ${className}`}
    >
      <div
        ref={scroller}
        data-slot="tools"
        onScroll={measure}
        className="flex items-center gap-px overflow-x-auto"
        style={{
          scrollbarWidth: 'none',
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        {children}
      </div>
      {o.start && (
        <button
          type="button"
          data-scroll-cue="start"
          tabIndex={-1}
          aria-label={t('bar.scrollBack', { count: o.hiddenStart })}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => slide(-1)}
          className={`${cue} left-0`}
        >
          <Icon name="chevronLeft" size={16} />
        </button>
      )}
      {o.end && (
        <button
          type="button"
          data-scroll-cue="end"
          tabIndex={-1}
          aria-label={t('bar.scrollMore', { count: o.hiddenEnd })}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => slide(1)}
          className={`${cue} right-0`}
        >
          <Icon name="chevronRight" size={16} />
          {o.hiddenEnd > 0 && (
            <span
              aria-hidden
              data-scroll-count
              className="absolute top-0.5 right-0.5 rounded-full bg-accent px-1 text-[10px] leading-4 font-semibold text-white"
            >
              {o.hiddenEnd}
            </span>
          )}
        </button>
      )}
      {o.thumb && (
        <div
          ref={track}
          data-bar-track
          data-pen-own
          role="scrollbar"
          aria-orientation="horizontal"
          aria-label={t('bar.scrollHandle')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(
            (o.thumb.left / Math.max(0.001, 1 - o.thumb.width)) * 100,
          )}
          tabIndex={-1}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            dragging.current = true
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              // Not a real pointer (a test): move and up still arrive.
            }
            toPointer(e)
          }}
          onPointerMove={(e) => dragging.current && toPointer(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: 'none' }}
          className="relative mt-0.5 h-5 cursor-pointer select-none"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
          <div
            data-bar-thumb
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink-soft"
            style={{
              left: `${o.thumb.left * 100}%`,
              width: `${o.thumb.width * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  )
}
