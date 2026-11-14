import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

/**
 * A sideways row that shows a thin track under itself when it is wider than
 * the screen (touch screens hide the browser's own bar, so we draw one).
 */
export function ScrollTrack({
  className = '',
  wrapClassName = '',
  barClassName = '',
  style,
  children,
  ...rest
}: {
  className?: string
  /** The outer box (holds the row and its track). */
  wrapClassName?: string
  barClassName?: string
  style?: CSSProperties
  children: ReactNode
  role?: string
  'aria-label'?: string
  'data-testid'?: string
  'data-mode'?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ w: number; x: number } | null>(null)

  const measure = () => {
    const el = ref.current
    if (!el) return
    const { scrollWidth: sw, clientWidth: cw, scrollLeft: sl } = el
    const next =
      sw > cw + 1 ? { w: (cw / sw) * 100, x: (Math.abs(sl) / sw) * 100 } : null
    setThumb((p) => (p && next && p.w === next.w && p.x === next.x ? p : next))
  }

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const c of Array.from(el.children)) ro.observe(c)
    return () => ro.disconnect()
  }, [children])

  return (
    <div className={wrapClassName}>
      <div
        ref={ref}
        className={`h-track ${className}`}
        style={style}
        onScroll={measure}
        {...rest}
      >
        {children}
      </div>
      {thumb && (
        <div
          data-testid="scroll-track"
          aria-hidden
          className={`h-track__bar ${barClassName}`}
          style={{ marginInline: style?.paddingInline }}
        >
          <span
            style={{ width: `${thumb.w}%`, insetInlineStart: `${thumb.x}%` }}
          />
        </div>
      )}
    </div>
  )
}
