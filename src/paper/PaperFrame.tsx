import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import type { Page, PaperBox } from '../core/types'
import { boxesOf, MAIN_BOX, mainBox, MARGIN, sheetOf } from './boxes'
import { clampBox, MIN_W } from './boxService'
import { bounds, record, replay, waitFor, type Recorded } from './penOnPaper'
import { activeTool } from '../app/tools/main/mainTools'
import { BOX_COLOURS } from './usePaperBoxes'
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
  renderBox,
  onAddBox,
  onBoxChange,
  onBoxMenu,
  onInkOnPaper,
  children,
}: {
  page: Pick<Page, 'sheet' | 'inkBg' | 'boxes'>
  /** The block editor of a box other than the default one. */
  renderBox?: (boxId: string) => ReactNode
  /** A tap on empty paper (mm); unset = no new boxes (read-only). */
  onAddBox?: (at: { x: number; y: number }) => void
  onBoxChange?: (boxId: string, patch: Partial<PaperBox>) => void
  onBoxMenu?: (box: PaperBox, at: DOMRect) => void
  /**
   * Rule 4: ink on empty paper. Makes a box (mm) with that many empty lines
   * and returns its id; unset = ink on empty paper is ignored.
   */
  onInkOnPaper?: (
    at: { x: number; y: number; w: number },
    lines: number,
  ) => Promise<string | null>
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
  const box = boxesOf(page)[0]
  const paperEl = useRef<HTMLDivElement>(null)
  // Where the other boxes end (px from the paper's top), for the sheet count.
  const [bottoms, setBottoms] = useState<Record<string, number>>({})
  const reportBottom = useCallback((id: string, px: number) => {
    setBottoms((b) => (b[id] === px ? b : { ...b, [id]: px }))
  }, [])

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
  const width = Math.max(1, ((fit * sheet.w) / mainBox(page).w) * zoom)
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
  const lowest = Math.max(
    boxBottom,
    ...boxesOf(page)
      .filter((b) => b.id !== MAIN_BOX)
      .map((b) => bottoms[b.id] ?? b.y * k),
  )
  const sheets = sheetCount(lowest + MARGIN * k, sheetPx)

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
  const extra = boxesOf(page).filter((b) => b.id !== MAIN_BOX)

  // Rule 4: a stroke on empty paper is recorded, a box is made under it and
  // the stroke is played into that box's ink pad.
  const pen = useRef<Recorded[] | null>(null)
  const penDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const tool = activeTool.get()
    if (!onInkOnPaper || flat || (tool !== 'pen' && tool !== 'highlighter'))
      return
    // A finger scrolls the paper; only the Pencil and the mouse write here.
    if (e.pointerType === 'touch') return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // A pointer the browser no longer knows: the moves still bubble here.
    }
    pen.current = [record('pointerdown', e.nativeEvent)]
  }
  const penMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    pen.current?.push(record('pointermove', e.nativeEvent))
  }
  const penUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const events = pen.current
    pen.current = null
    if (!events || !onInkOnPaper) return
    events.push(record('pointerup', e.nativeEvent))
    const r = paperEl.current?.getBoundingClientRect()
    if (!r) return
    const b = bounds(events)
    const stepMm = step / k
    const x = Math.max(0, (b.x - r.left) / k - 4)
    const y = Math.max(0, snap((b.y - r.top) / k - stepMm / 2, stepMm))
    const w = Math.max(MIN_W, b.w / k + 8)
    const lines = Math.ceil((b.h / k + stepMm) / stepMm) + 1
    void onInkOnPaper({ x, y, w }, lines).then(async (id) => {
      if (!id) return
      const pad = await waitFor(() =>
        document.querySelector(
          '[data-paper-box="' + CSS.escape(id) + '"] [data-ink-pad]',
        ),
      )
      // The box's lines are laid out a frame after its pad shows.
      if (pad) requestAnimationFrame(() => replay(pad, events))
    })
  }

  /** A tap on empty paper with the Text tool: a new box there (step 3). */
  const tapPaper = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onAddBox || flat || e.button !== 0) return
    if (
      e.target !== e.currentTarget &&
      !(e.target as Element).closest('[data-paper-sheet]')
    )
      return
    const r = paperEl.current?.getBoundingClientRect()
    if (!r) return
    const x = (e.clientX - r.left) / k
    const y = (e.clientY - r.top) / k
    // Inside the default box's column the tap belongs to the page's text.
    onAddBox({ x: Math.max(0, x - 4), y: Math.max(0, snap(y, step / k)) })
  }

  // Nothing around the default box is positioned (no relative or absolute),
  // so its editor's menus and the ink overlay keep the same containing blocks
  // as before: the sheets are normal blocks and the box is pulled up over
  // them. Other boxes sit in a zero-height positioned layer of their own.
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
          ref={paperEl}
          data-paper
          data-sheet={page.sheet ?? 'A4'}
          style={
            flat
              ? undefined
              : ({
                  width,
                  minHeight: total,
                  visibility: fit > 0 ? 'visible' : 'hidden',
                  // The text starts exactly where it always did: the sheet's
                  // top margin reaches up behind the line above the paper.
                  marginTop: -box.y * k,
                } as CSSProperties)
          }
        >
          {!flat && extra.length > 0 && (
            <div
              data-paper-boxes
              style={{ position: 'relative', height: 0, zIndex: 6 }}
            >
              {extra.map((b) => (
                <BoxFrame
                  key={b.id}
                  box={b}
                  k={k}
                  zoom={zoom}
                  sheetW={sheet.w}
                  stepMm={step / k}
                  lineH={step / zoom}
                  onBottom={(px) => reportBottom(b.id, px)}
                  onChange={(patch) => onBoxChange?.(b.id, patch)}
                  onMenu={(at) => onBoxMenu?.(b, at)}
                >
                  {renderBox?.(b.id)}
                </BoxFrame>
              ))}
            </div>
          )}
          {!flat && (
            <div
              data-paper-sheets
              onPointerDown={penDown}
              onPointerMove={penMove}
              onPointerUp={(e) => {
                penUp(e)
                tapPaper(e)
              }}
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
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          <div
            ref={boxEl}
            data-paper-box="main"
            style={
              flat
                ? undefined
                : {
                    marginLeft: box.x * k,
                    width: box.w * k,
                    marginTop: box.y * k - total,
                    paddingBottom: MARGIN * k,
                  }
            }
          >
            <div style={zoom === 1 || flat ? undefined : { zoom }}>
              {children}
            </div>
          </div>
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

/** Rounds a length in mm to the paper's line spacing. */
const snap = (mm: number, stepMm: number) =>
  stepMm > 0 ? Math.round(mm / stepMm) * stepMm : mm

type Drag = {
  how: 'move' | 'left' | 'right'
  x0: number
  y0: number
  box: PaperBox
}

/**
 * One box other than the default one: placed at its x, y (mm), its own block
 * editor inside. A grip on top moves it; the left and right edges (and the
 * bottom corners) change its width; the height follows the text, so Enter
 * grows the box, never the page. A locked box shows no grip or edges.
 */
function BoxFrame({
  box,
  k,
  zoom,
  sheetW,
  stepMm,
  lineH,
  onBottom,
  onChange,
  onMenu,
  children,
}: {
  box: PaperBox
  k: number
  zoom: number
  sheetW: number
  stepMm: number
  /** Text line height in the box's own px: the paper's line spacing. */
  lineH: number
  onBottom: (px: number) => void
  onChange: (patch: Partial<PaperBox>) => void
  onMenu: (at: DOMRect) => void
  children: ReactNode
}) {
  const el = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState<PaperBox | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const shown = live ?? box
  useEffect(() => {
    const node = el.current
    if (!node) return
    const ro = new ResizeObserver(() =>
      onBottom(node.offsetTop + node.offsetHeight),
    )
    ro.observe(node)
    return () => ro.disconnect()
  }, [onBottom])

  const start = (how: Drag['how'], e: ReactPointerEvent) => {
    if (box.locked || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDrag({ how, x0: e.clientX, y0: e.clientY, box })
  }
  const move = (e: ReactPointerEvent) => {
    const d = drag
    if (!d) return
    const dx = (e.clientX - d.x0) / k
    const dy = (e.clientY - d.y0) / k
    const b = d.box
    const next =
      d.how === 'move'
        ? { ...b, x: b.x + dx, y: snap(b.y + dy, stepMm) }
        : d.how === 'right'
          ? { ...b, w: b.w + dx }
          : { ...b, x: b.x + dx, w: b.w - dx }
    setLive(clampBox(next, sheetW))
  }
  const end = () => {
    const d = drag
    setDrag(null)
    if (!d || !live) return setLive(null)
    onChange({ x: live.x, y: live.y, w: live.w })
    setLive(null)
  }
  return (
    <div
      ref={el}
      data-paper-box={box.id}
      data-locked={box.locked ? '' : undefined}
      className="group absolute rounded-md outline-1 outline-dashed outline-transparent hover:outline-line focus-within:outline-line"
      style={{
        left: shown.x * k,
        top: shown.y * k,
        width: shown.w * k,
        background: box.colour
          ? `color-mix(in srgb, ${BOX_COLOURS[box.colour] ?? box.colour} 14%, transparent)`
          : undefined,
      }}
    >
      <div
        data-chrome
        className="absolute -top-6 left-0 right-0 flex h-6 items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
      >
        {box.locked ? (
          <span aria-hidden className="px-1 text-xs text-muted">
            🔒
          </span>
        ) : (
          <button
            type="button"
            data-box-grip
            aria-label={t('paper.box.move')}
            onPointerDown={(e) => start('move', e)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="h-6 min-w-10 cursor-grab touch-none rounded px-2 text-xs leading-none text-muted hover:bg-hover"
          >
            ⠿
          </button>
        )}
        <button
          type="button"
          data-box-menu
          aria-label={t('paper.box.menu')}
          aria-haspopup="menu"
          onClick={(e) => onMenu(e.currentTarget.getBoundingClientRect())}
          className="h-6 min-w-8 rounded px-1 text-sm leading-none text-muted hover:bg-hover"
        >
          ⋯
        </button>
      </div>
      {!box.locked &&
        (['left', 'right'] as const).map((how) => (
          <div
            key={how}
            data-box-edge={how}
            role="separator"
            aria-orientation="vertical"
            aria-label={t('paper.box.resize')}
            onPointerDown={(e) => start(how, e)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute inset-y-0 w-3 cursor-ew-resize touch-none"
            style={{ [how]: -6 }}
          />
        ))}
      <div
        className="px-1"
        style={{
          ...(zoom === 1 ? {} : { zoom }),
          ['--box-line' as string]: lineH + 'px',
        }}
      >
        {children}
      </div>
    </div>
  )
}
