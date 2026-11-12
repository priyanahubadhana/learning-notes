import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { openInTopLayer } from '../../app/overlay'
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
 * the choice is remembered. The layer is a persistent overlay in the top layer, so the
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
  const [underPanel, setUnderPanel] = useState(false)

  // Top layer through the overlay manager as a persistent bar: it stays open
  // on an outside tap and Esc; only the reading lock (hidden) closes it.
  useEffect(() => {
    const el = host.current
    if (!el || hidden) return
    const h = openInTopLayer(el, {
      id: 'reader-v2-bars',
      layer: 'bar',
      persistent: true,
    })
    return () => h.close()
  }, [hidden])

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
  // A plain effect, not a layout effect: when the bars mount together with the
  // reader (the second book opened in a session, the code already loaded) the
  // reader's own box is only attached after a layout effect would have run.
  useEffect(() => {
    measure()
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [measure, rootRef])

  // A narrow screen lays the left panel (Pages / Outline / Audio tabs) over the
  // reader's top. The panel starts below the bar (it reads --rv2-bar-bottom),
  // so the bar never covers its tab row or clips its first chip, and the
  // ✕ Exit reading stays in reach. Without the bar the variable is gone.
  useEffect(() => {
    const check = () => {
      const panel = document.querySelector('[data-testid="left-panel"]')
      setUnderPanel(
        !!panel && window.getComputedStyle(panel).position === 'fixed',
      )
    }
    check()
    if (typeof MutationObserver === 'undefined') return
    const mo = new MutationObserver(check)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])
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

  const barBottom =
    underPanel && stackShown && !away && !hidden ? box.top + stackH : 0
  useLayoutEffect(() => {
    const root = document.documentElement
    if (barBottom > 0)
      root.style.setProperty('--rv2-bar-bottom', `${barBottom + EDGE_GAP}px`)
    else root.style.removeProperty('--rv2-bar-bottom')
    return () => {
      root.style.removeProperty('--rv2-bar-bottom')
    }
  }, [barBottom])

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
      <div ref={host} className="rv2-host" data-testid="rv2-host">
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
