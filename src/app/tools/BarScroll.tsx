import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { t } from '../../i18n/t'
import { useFlag } from '../flags'
import { PRIORITY, onRouted } from '../input/eventRouter'
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
  minPx,
}: {
  children: ReactNode
  className?: string
  /** New frame: the strip is at least this tall in every mode (R19). */
  minPx?: number
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [o, setO] = useState<Overflow>(NONE)
  // A tool cut by the edge is hidden whole (a half glyph looks like a fault).
  const [cut, setCut] = useState<{ start: number; end: number | null }>({
    start: 0,
    end: null,
  })

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    // Why: in a column so narrow that the two scroll cues take all the room,
    // the strip measures 0 wide, which read as "fits", took the cues away, the
    // strip grew back, and the bar flickered every frame (touchTargets 700x800).
    // A 0-wide strip is not a measurement: keep what was last known.
    if (el.clientWidth <= 0) return
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
    const sl = el.scrollLeft
    const cw = el.clientWidth
    let start = 0
    let end: number | null = null
    for (const e of edges) {
      if (e.left < sl - 0.5 && e.right > sl + 0.5) start = e.right - sl
      if (e.left < sl + cw - 0.5 && e.right > sl + cw + 0.5) end = e.left - sl
    }
    setCut((old) =>
      old.start === start && old.end === end ? old : { start, end },
    )
  }, [])

  // With Phase 1 (foundation.shell) on, measured before the first paint: the
  // scroll handle must not appear a frame later (R14).
  const shell = useFlag('foundation.shell')
  useLayoutEffect(() => {
    if (shell) measure()
  }, [measure, children, shell])
  useEffect(() => {
    measure()
    const el = scroller.current
    if (!el) return
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    for (const child of el.children) watch.observe(child)
    // Why: the observer answers a few hundred ms late on WebKit after a turn, so
    // the scroll handle stayed 22 px too long and the page below moved late
    // (BUG-002 turn test, ipad-webkit). The window's own resize measures at once.
    // Heard through the one router listener; runs before the format bar's
    // (normal priority) so that bar is placed for the settled layout.
    const stop = onRouted(
      'resize',
      () => {
        flushSync(measure)
      },
      { priority: PRIORITY.normal + 1, name: 'barScroll' },
    )
    return () => {
      stop()
      watch.disconnect()
    }
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

  const mask =
    cut.start > 0 || cut.end !== null
      ? `linear-gradient(to right, transparent ${cut.start}px, #000 ${cut.start}px, #000 ${cut.end ?? 100000}px, transparent ${cut.end ?? 100000}px)`
      : undefined
  const cue =
    'relative grid min-w-11 shrink-0 place-items-center self-stretch text-ink-soft hover:text-ink'
  return (
    <div
      data-bar-scroll
      data-overflow={o.start || o.end || undefined}
      className={`relative min-w-0 ${className}`}
    >
      <div
        className="flex items-stretch"
        // P1.9 R19: as tall as Pencil mode's buttons in every mode, so a mode change moves nothing.
        style={shell && minPx ? { minHeight: minPx } : undefined}
      >
        {o.start && (
          <button
            type="button"
            data-scroll-cue="start"
            tabIndex={-1}
            aria-label={t('bar.scrollBack', { count: o.hiddenStart })}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => slide(-1)}
            className={cue}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
        )}
        <div
          ref={scroller}
          data-slot="tools"
          // At once, not a frame later: the scroll cue takes room, so a late
          // update moved the tools under a finger already pressing one.
          onScroll={() => flushSync(measure)}
          className="flex min-w-0 flex-1 items-center gap-px overflow-x-auto"
          style={{
            scrollbarWidth: 'none',
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        >
          {children}
        </div>
        {o.end && (
          <button
            type="button"
            data-scroll-cue="end"
            tabIndex={-1}
            aria-label={t('bar.scrollMore', { count: o.hiddenEnd })}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => slide(1)}
            className={cue}
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
      </div>
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
