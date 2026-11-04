import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react'

/**
 * A row that scrolls sideways. The edge that has more beyond it fades out, so
 * nothing looks half cut by accident, and (with `snap`) a scroll comes to rest
 * with a whole item at the start.
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

  const fade = 28
  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edges.end ? 'transparent' : '#000'} 100%)`
      : undefined
  return (
    <div
      ref={ref}
      data-fade-start={edges.start || undefined}
      data-fade-end={edges.end || undefined}
      onScroll={measure}
      className={`overflow-x-auto ${snap ? 'snap-x snap-proximity' : ''} ${className}`}
      style={{
        scrollbarWidth: 'none',
        maskImage: mask,
        WebkitMaskImage: mask,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
