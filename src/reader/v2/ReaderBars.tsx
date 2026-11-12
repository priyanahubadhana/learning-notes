import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { usePref } from '../../app/usePref'
import { t } from '../../i18n/t'
import { CHIP_H, CHIP_TOP, EDGE_GAP, chipTops } from './barLayout'
import {
  BARS_KEY,
  DEFAULT_BARS,
  isBarState,
  setMinimised,
  type BarId,
} from './barState'
import './readerV2.css'

/**
 * Reader v2 (slice 7a): the reader bar and the drawing bar in one stack.
 * Each can shrink to its own chip on the right edge and come back on its own;
 * the choice is remembered. The layer is a manual popover (top layer), so the
 * sidebar never covers the ✕ Exit reading.
 */
export default function ReaderBars({
  hidden,
  away,
  rootRef,
  reader,
  ink,
}: {
  /** The reading lock hides the bars completely. */
  hidden: boolean
  /** Scrolled down: the stack slides away (a minimised bar stays minimised). */
  away: boolean
  rootRef: RefObject<HTMLElement | null>
  reader: ReactNode
  ink: ReactNode | null
}) {
  const [bars, setBars] = usePref(BARS_KEY, isBarState, DEFAULT_BARS)
  const host = useRef<HTMLDivElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({
    left: EDGE_GAP,
    top: EDGE_GAP,
    width: 0,
    top0: 0,
  })
  const [stackH, setStackH] = useState(0)
  const [vh, setVh] = useState(() => window.innerHeight)

  // Top layer. Browsers without it keep the same host in place.
  useEffect(() => {
    const el = host.current
    try {
      if (
        el &&
        typeof el.showPopover === 'function' &&
        !el.matches(':popover-open')
      )
        el.showPopover()
    } catch {
      /* not supported: shown in place */
    }
  })

  // Follow the reader's own box (the sidebar may be beside it) and the screen.
  const measure = useCallback(() => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return
    const right = Math.min(r.right, window.innerWidth) - EDGE_GAP
    const left = Math.max(r.left, 0) + EDGE_GAP
    setBox({
      left,
      top: r.top + EDGE_GAP,
      width: Math.max(0, right - left),
      top0: r.top,
    })
    setVh(window.innerHeight)
  }, [rootRef])
  useLayoutEffect(() => {
    measure()
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [measure, rootRef])
  const hasInk = ink != null
  const showReader = !bars.reader
  const showInk = hasInk && !bars.draw
  const stackShown = showReader || showInk
  useLayoutEffect(() => {
    const el = stack.current
    if (!el) {
      setStackH(0)
      return
    }
    setStackH(el.offsetHeight)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setStackH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [stackShown, hidden])

  if (hidden) return null

  const chips: BarId[] = [
    ...(bars.reader ? (['reader'] as const) : []),
    ...(hasInk && bars.draw ? (['draw'] as const) : []),
  ]
  const below = stackShown ? stackH + 2 * EDGE_GAP : 0
  const tops = chipTops(
    vh,
    Math.max(box.top0 + CHIP_TOP, box.top0 + below),
    chips.length,
  )

  const bar = (id: BarId, body: ReactNode) => (
    <div className="rv2-bar glass-flat" data-testid={`rv2-${id}-bar`}>
      <div className="rv2-bar__body">{body}</div>
      <button
        type="button"
        className="rv2-min"
        data-testid={`rv2-${id}-min`}
        aria-label={t(
          id === 'reader' ? 'readerv2.hide.reader' : 'readerv2.hide.draw',
        )}
        onClick={() => setBars(setMinimised(bars, id, true))}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M6 3l5 5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )

  return (
    <>
      {/* Keeps the page below the bars while they show. */}
      <div aria-hidden style={{ height: stackShown ? stackH + EDGE_GAP : 0 }} />
      <div
        ref={host}
        popover="manual"
        className="rv2-host"
        data-testid="rv2-host"
      >
        {stackShown && (
          <div
            ref={stack}
            className={`rv2-stack ${away ? 'rv2-stack--away' : ''}`}
            data-testid="rv2-stack"
            inert={away || undefined}
            style={{ left: box.left, top: box.top, width: box.width }}
          >
            {showReader && bar('reader', reader)}
            {showInk && bar('draw', ink)}
          </div>
        )}
        <div className="rv2-chips">
          {chips.map((id, i) => (
            <button
              key={id}
              type="button"
              className="rv2-chip glass-flat"
              data-testid={`rv2-${id}-chip`}
              aria-label={t(
                id === 'reader' ? 'readerv2.show.reader' : 'readerv2.show.draw',
              )}
              style={{ top: tops[i], height: CHIP_H }}
              onClick={() => setBars(setMinimised(bars, id, false))}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M10 3L5 8l5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t(
                id === 'reader' ? 'readerv2.chip.reader' : 'readerv2.chip.draw',
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
