import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import type { Page } from '../core/types'
import { mainBox, MARGIN, sheetOf } from './boxes'
import { clampZoom, paperStepMm, sheetCount, SHEET_GAP_PX } from './sheets'

/**
 * Phase Q step 2: the page shown as paper. Fixed sheets (A4 or Letter) with
 * a border and the page's background, stacked top to bottom; the default
 * box (the page's editor, `children`) sits on them at its place. Zoom keeps
 * the text sharp (CSS zoom on the box) and changes the paper's real width;
 * pan is the scroll of the frame. Two fingers pinch; the Pencil never zooms.
 */
export function PaperFrame({
  page,
  flat = false,
  children,
}: {
  page: Pick<Page, 'sheet' | 'inkBg' | 'boxes'>
  /** The full-screen reader: plain flowing text, same tree (nothing remounts). */
  flat?: boolean
  children: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const boxEl = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [boxBottom, setBoxBottom] = useState(0)
  const sheet = sheetOf(page)
  const box = (page.boxes ?? []).find((b) => b.id === 'main') ?? mainBox(page)

  // Fit width = the column the page sits in.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    // The column (the frame itself reaches out by the margins).
    const col = el.parentElement ?? el
    // Hidden (another tab): keep the last width, so nothing reflows.
    const measure = () => {
      if (col.clientWidth > 0) setFit(col.clientWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(col)
    return () => ro.disconnect()
  }, [])

  // At 100 % the default box is exactly the page column (so the text sits
  // where it always did); the sheet's margins reach out beside the column.
  const width = Math.max(1, ((fit * sheet.w) / box.w) * zoom)
  const k = width / sheet.w // px per mm
  const sheetPx = sheet.h * k

  // The paper grows a sheet at a time under the box's text.
  useEffect(() => {
    const el = boxEl.current
    if (!el) return
    const measure = () =>
      setBoxBottom(
        el.getBoundingClientRect().bottom -
          (el.parentElement?.getBoundingClientRect().top ?? 0),
      )
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [k])
  const sheets = sheetCount(boxBottom + MARGIN * k, sheetPx)

  // Pinch (two fingers) and Ctrl + wheel zoom around the point between them.
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const zoomAt = (next: number, clientX: number, clientY: number) => {
      const z0 = zoomRef.current
      const z1 = clampZoom(next)
      if (z1 === z0) return
      const r = el.getBoundingClientRect()
      const px = el.scrollLeft + clientX - r.left
      const py = el.scrollTop + clientY - r.top
      zoomRef.current = z1
      setZoom(z1)
      requestAnimationFrame(() => {
        el.scrollLeft = (px * z1) / z0 - (clientX - r.left)
        el.scrollTop = (py * z1) / z0 - (clientY - r.top)
      })
    }
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      zoomAt(zoomRef.current * Math.exp(-e.deltaY / 300), e.clientX, e.clientY)
    }
    let pinch: { d: number; z: number } | null = null
    const fingers = (e: TouchEvent) =>
      Array.from(e.touches).filter(
        (x) => (x as Touch & { touchType?: string }).touchType !== 'stylus',
      )
    const dist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const start = (e: TouchEvent) => {
      const f = fingers(e)
      if (f.length === 2) pinch = { d: dist(f[0], f[1]), z: zoomRef.current }
    }
    const move = (e: TouchEvent) => {
      const f = fingers(e)
      if (!pinch || f.length !== 2) return
      if (e.cancelable) e.preventDefault()
      zoomAt(
        (pinch.z * dist(f[0], f[1])) / Math.max(1, pinch.d),
        (f[0].clientX + f[1].clientX) / 2,
        (f[0].clientY + f[1].clientY) / 2,
      )
    }
    const end = (e: TouchEvent) => {
      if (fingers(e).length < 2) pinch = null
    }
    // Safari's own page pinch must not fight ours.
    const gesture = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('touchstart', start, { passive: true, capture: true })
    el.addEventListener('touchmove', move, { passive: false, capture: true })
    el.addEventListener('touchend', end, { capture: true })
    el.addEventListener('touchcancel', end, { capture: true })
    el.addEventListener('gesturestart', gesture)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('touchstart', start, { capture: true })
      el.removeEventListener('touchmove', move, { capture: true })
      el.removeEventListener('touchend', end, { capture: true })
      el.removeEventListener('touchcancel', end, { capture: true })
      el.removeEventListener('gesturestart', gesture)
    }
  }, [])

  const step = paperStepMm(page.inkBg) * k
  const total = sheets * (sheetPx + SHEET_GAP_PX) - SHEET_GAP_PX
  // Nothing here is positioned (no relative or absolute), so the editor's
  // menus and the ink overlay keep the same containing blocks as before:
  // the sheets are normal blocks, pulled up behind the box.
  return (
    <div>
      <div
        ref={scroller}
        data-paper-scroller
        // At 100 % nothing scrolls here (the page scrolls as before); zoomed
        // in, the paper pans sideways inside this frame.
        style={{
          touchAction: 'pan-x pan-y',
          overflowX: zoom > 1 ? 'auto' : 'visible',
          ...(flat ? {} : { marginLeft: -box.x * (width / sheet.w) }),
        }}
      >
        <div
          data-paper
          data-sheet={page.sheet ?? 'A4'}
          style={
            flat
              ? undefined
              : {
                  width,
                  minHeight: total,
                  // The text starts exactly where it always did: the sheet's
                  // top margin reaches up behind the line above the paper.
                  marginTop: -box.y * k,
                  visibility: fit > 0 ? 'visible' : 'hidden',
                }
          }
        >
          <div
            ref={boxEl}
            data-paper-box="main"
            style={
              flat
                ? undefined
                : {
                    marginLeft: box.x * k,
                    width: box.w * k,
                    marginTop: box.y * k,
                    paddingBottom: MARGIN * k,
                  }
            }
          >
            <div style={zoom === 1 || flat ? undefined : { zoom }}>
              {children}
            </div>
          </div>
          {!flat && (
            <div
              data-paper-sheets
              // After the box in the page, pulled up behind it: the text is
              // above every sheet for painting and for taps.
              style={{ marginTop: -(boxBottom + MARGIN * k) }}
            >
              {Array.from({ length: sheets }, (_, i) => (
                <div
                  key={i}
                  data-paper-sheet={i + 1}
                  data-paper-bg={page.inkBg}
                  className="rounded-sm border border-line bg-surface shadow-sm"
                  style={
                    {
                      height: sheetPx,
                      marginBottom: i < sheets - 1 ? SHEET_GAP_PX : 0,
                      '--paper-step': step + 'px',
                      '--paper-offset': ((box.y * k) % step) + 'px',
                    } as React.CSSProperties
                  }
                ></div>
              ))}
            </div>
          )}
        </div>
      </div>
      {!flat && (
        <div
          data-chrome
          className="mt-2 ml-auto flex w-max items-center gap-1 rounded-full border border-line bg-surface px-1 py-0.5 text-xs shadow-sm"
        >
          <Tip id="paper.zoomOut" touchInfo={false}>
            <button
              type="button"
              aria-label={t('paper.zoomOut')}
              onClick={() => setZoom((z) => clampZoom(z / 1.25))}
              className="min-h-8 min-w-8 rounded-full hover:bg-hover"
            >
              −
            </button>
          </Tip>
          <Tip id="paper.zoomFit" touchInfo={false}>
            <button
              type="button"
              aria-label={t('paper.zoomFit')}
              onClick={() => setZoom(1)}
              className="min-h-8 rounded-full px-2 tabular-nums hover:bg-hover"
            >
              {Math.round(zoom * 100)} %
            </button>
          </Tip>
          <Tip id="paper.zoomIn" touchInfo={false}>
            <button
              type="button"
              aria-label={t('paper.zoomIn')}
              onClick={() => setZoom((z) => clampZoom(z * 1.25))}
              className="min-h-8 min-w-8 rounded-full hover:bg-hover"
            >
              +
            </button>
          </Tip>
        </div>
      )}
    </div>
  )
}
