import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { t } from '../../i18n/t'
import { Icon } from './icons'

/**
 * A row that scrolls sideways. When it overflows (bug batch 1, item 49):
 * a chevron button sits at each edge that has more beyond it; the mouse wheel
 * scrolls it sideways; a thin scrollbar shows while the pointer is over it; a
 * swipe or drag scrolls it on touch. With `snap` a scroll comes to rest with
 * a whole item at the start. The chevrons are zero-width sticky children, so
 * the row's own layout (flex, gaps) does not change. Both holders are always
 * there: one that came and went would add or take away a flex gap, and every
 * tool would slide by it just after a tap (a quick second tap would miss).
 */
export function ScrollFade({
  snap,
  className = '',
  style,
  children,
  ...rest
}: ComponentProps<'div'> & { snap?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const x = Math.abs(el.scrollLeft)
    const next = { start: x > 2, end: max - x > 2 }
    setEdges((old) =>
      old.start === next.start && old.end === next.end ? old : next,
    )
  }, [])

  useEffect(() => {
    measure()
    const el = ref.current
    if (!el) return
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    for (const child of el.children) watch.observe(child)
    return () => watch.disconnect()
  }, [measure, children])

  // The wheel scrolls the row sideways (a mouse has no horizontal wheel).
  useEffect(() => {
    const el = ref.current
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
    ref.current?.scrollBy({
      left: direction * ref.current.clientWidth * 0.7,
      behavior: 'smooth',
    })
  // The sticky holder below is already its own layer, with this button as its
  // only child, so the button needs no layer of its own.
  const cue =
    'pointer-events-auto absolute inset-y-0 grid w-7 place-items-center bg-surface text-ink-soft hover:text-ink'
  const holder = 'pointer-events-none sticky z-[2] w-0 shrink-0 self-stretch'
  return (
    <div
      ref={ref}
      data-fade-start={edges.start || undefined}
      data-fade-end={edges.end || undefined}
      onScroll={measure}
      className={`overflow-x-auto scroll-px-9 [scrollbar-width:none] hover:[scrollbar-width:thin] ${snap ? 'snap-x snap-proximity' : ''} ${className}`}
      style={style}
      {...rest}
    >
      <span className={`${holder} left-0`}>
        {edges.start && (
          <button
            type="button"
            data-scroll-chevron="start"
            tabIndex={-1}
            aria-label={t('bar.scrollBack')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => slide(-1)}
            className={`${cue} left-0`}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
        )}
      </span>
      {children}
      <span className={`${holder} right-0`}>
        {edges.end && (
          <button
            type="button"
            data-scroll-chevron="end"
            tabIndex={-1}
            aria-label={t('bar.scrollRight')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => slide(1)}
            className={`${cue} right-0`}
          >
            <Icon name="chevronRight" size={16} />
          </button>
        )}
      </span>
    </div>
  )
}
