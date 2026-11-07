import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { penSettings } from '../app/tools/main/inkSettings'
import { activeTool } from '../app/tools/main/mainTools'
import { readPref, writePref } from '../app/uiPrefs'
import { t } from '../i18n/t'
import type { InkController } from './controller'
import {
  advanceTarget,
  clampPadHeight,
  isZoom,
  nextLine,
  space,
  targetSize,
  toPage,
  ZOOMS,
  type Pad,
} from './magnifier'
import { magnifierTool } from './toolState'

/**
 * The Magnifier (G1, reworked 7 Nov after the owner's iPad pass): a big pad
 * across the bottom of the screen (30 % of it; drag its top edge, 20 to
 * 50 %). Write large in it; each stroke lands small in the target box on the
 * page. The pad SHOWS the page's own ink inside the box, so page and pad
 * are always the same: erasing on the page clears the pad at once, and the
 * Eraser tool rubs the page from the pad. The box moves on by itself when
 * the pen lifts in the pad's right fifth, and by hand with Space, Next line
 * or by dragging the box's label. A finger, the Pencil and a mouse all work
 * in the pad. The strokes are ordinary ink (one Undo each).
 */

interface PadPoint {
  x: number
  y: number
  p: number
  t: number
}

const HINT_PREF = 'ink.magnifier.hinted'

export function MagnifierView({
  controller,
  wrap,
}: {
  controller: InkController
  wrap: HTMLElement
}) {
  const { on, zoom, target, height } = magnifierTool.useValue()
  const [pad, setPad] = useState<Pad>({ w: 600, h: 200 })
  const padEl = useRef<HTMLDivElement | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // The stroke being written now (pad px), drawn over the page's ink.
  const current = useRef<PadPoint[] | null>(null)
  const erasing = useRef(false)
  const t0 = useRef(0)
  const [hinted, setHinted] = useState(() =>
    readPref(HINT_PREF, (v): v is boolean => typeof v === 'boolean', false),
  )
  const [, bump] = useState(0)
  const tool = activeTool.useValue()

  // Where the box starts: near the top of what is on screen.
  useEffect(() => {
    if (on && !target) {
      const v = controller.view()
      magnifierTool.set({
        on,
        zoom,
        height,
        target: { x: v.width * 0.05, y: v.top + 120 },
      })
    }
  }, [on, target, zoom, height, controller])

  // The pad's real size (the canvas must match it exactly, or the ink
  // shows away from the pen). Measured from the element itself, whenever
  // it exists and whenever it changes size.
  const padRef = useCallback((el: HTMLDivElement | null) => {
    padEl.current = el
    if (!el) return
    const measure = () =>
      setPad({
        w: Math.max(120, el.clientWidth),
        h: Math.max(80, el.clientHeight),
      })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The page's ink changed (a stroke, an erase, Undo): the pad follows at once.
  useEffect(() => {
    if (!on) return
    return controller.subscribeDoc(() => bump((n) => n + 1))
  }, [on, controller])

  const redraw = () => {
    const c = canvas.current
    const g = c?.getContext('2d')
    if (!c || !g || !target) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.round(pad.w * dpr)
    const h = Math.round(pad.h * dpr)
    if (c.width !== w || c.height !== h) {
      c.width = w
      c.height = h
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, pad.w, pad.h)
    // The page's ink inside the box, magnified: one source of truth.
    const box = targetSize(pad, zoom)
    controller.paintRegion(g, dpr, { x: target.x, y: target.y, ...box }, zoom)
    const s = current.current
    if (!s || s.length === 0 || erasing.current) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.strokeStyle = penSettings.get().colour
    g.lineWidth = 3
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(s[0].x, s[0].y)
    for (const q of s) g.lineTo(q.x, q.y)
    if (s.length === 1) g.lineTo(s[0].x + 0.1, s[0].y)
    g.stroke()
  }
  useLayoutEffect(redraw)

  if (!on || !target) return null
  const box = targetSize(pad, zoom)
  const move = (to: typeof target) =>
    magnifierTool.set({ on, zoom, height, target: to })
  const eraser = tool === 'eraser'

  const local = (e: { clientX: number; clientY: number }) => {
    const b = padEl.current!.getBoundingClientRect()
    return {
      x: e.clientX - b.left - padEl.current!.clientLeft,
      y: e.clientY - b.top - padEl.current!.clientTop,
    }
  }
  const onDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test).
    }
    if (!hinted) {
      setHinted(true)
      writePref(HINT_PREF, true)
    }
    const p = local(e)
    if (eraser) {
      erasing.current = true
      controller.beginErase(toPage(p, target, zoom))
      return
    }
    t0.current = e.timeStamp
    current.current = [{ ...p, p: pressure(e), t: 0 }]
    redraw()
  }
  const onMove = (e: ReactPointerEvent) => {
    if (erasing.current) {
      controller.eraseMove(toPage(local(e), target, zoom))
      return
    }
    if (!current.current) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    for (const c of events.length > 0 ? events : [e.nativeEvent]) {
      current.current.push({
        ...local(c),
        p: pressure(c),
        t: c.timeStamp - t0.current,
      })
    }
    redraw()
  }
  const onUp = () => {
    if (erasing.current) {
      erasing.current = false
      controller.endErase()
      return
    }
    const stroke = current.current
    current.current = null
    if (!stroke || stroke.length === 0) return
    controller.addWriting(
      stroke.map((q) => ({ ...toPage(q, target, zoom), p: q.p, t: q.t })),
      1.4 / zoom,
    )
    const next = advanceTarget(
      stroke,
      pad,
      target,
      zoom,
      controller.view().width,
    )
    if (next) move(next)
    redraw()
  }

  /** Dragging the box's label (or its handle) moves the box on the page. */
  const dragBox = (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test).
    }
    const b = wrap.getBoundingClientRect()
    const grab = {
      x: e.clientX - b.left - target.x,
      y: e.clientY - b.top - target.y,
    }
    const onMoveBox = (m: PointerEvent) => {
      move({
        x: Math.max(0, m.clientX - b.left - grab.x),
        y: Math.max(0, m.clientY - b.top - grab.y),
      })
    }
    const done = () => {
      el.removeEventListener('pointermove', onMoveBox)
      el.removeEventListener('pointerup', done)
      el.removeEventListener('pointercancel', done)
    }
    el.addEventListener('pointermove', onMoveBox)
    el.addEventListener('pointerup', done)
    el.addEventListener('pointercancel', done)
  }

  /** Dragging the pad's top edge makes it taller or shorter. */
  const dragEdge = (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test).
    }
    const onMoveEdge = (m: PointerEvent) => {
      const share = (window.innerHeight - m.clientY) / window.innerHeight
      magnifierTool.set({
        on,
        zoom,
        target,
        height: clampPadHeight(share),
      })
    }
    const done = () => {
      el.removeEventListener('pointermove', onMoveEdge)
      el.removeEventListener('pointerup', done)
      el.removeEventListener('pointercancel', done)
    }
    el.addEventListener('pointermove', onMoveEdge)
    el.addEventListener('pointerup', done)
    el.addEventListener('pointercancel', done)
  }

  const btn =
    'min-h-11 rounded-lg px-3 text-sm text-ink hover:bg-hover aria-pressed:bg-accent aria-pressed:text-white'
  const noCallout = { WebkitTouchCallout: 'none' } as const
  return (
    <>
      <div
        data-magnifier-target
        aria-hidden
        className="pointer-events-none absolute rounded-sm border-2 border-accent bg-accent/10"
        style={{ left: target.x, top: target.y, width: box.w, height: box.h }}
      >
        {/* The label is the box's grip: drag it anywhere on the page. */}
        <button
          type="button"
          tabIndex={-1}
          data-ink-handles
          data-magnifier-handle
          aria-label={t('ink.magnifier.moveBox')}
          onPointerDown={dragBox}
          style={noCallout}
          className="pointer-events-auto absolute -top-7 left-0 flex h-7 max-w-full cursor-move touch-none items-center gap-1 whitespace-nowrap rounded-t-md bg-accent px-2 text-[11px] font-medium text-white"
        >
          <span aria-hidden>⠿</span>
          {t('ink.magnifier.boxLabel')}
        </button>
      </div>
      {createPortal(
        <div
          role="group"
          aria-label={t('ink.magnifier')}
          data-chrome
          data-magnifier
          style={{ height: `${Math.round(height * 100)}vh`, ...noCallout }}
          className="fixed inset-x-0 bottom-0 z-[60] flex select-none flex-col rounded-t-2xl border border-ink-soft bg-bg shadow-[0_-2px_4px_rgba(0,0,0,0.08),0_-10px_28px_rgba(0,0,0,0.2)]"
        >
          <div
            role="separator"
            aria-label={t('ink.magnifier.resize')}
            aria-orientation="horizontal"
            data-magnifier-resize
            onPointerDown={dragEdge}
            className="grid h-6 shrink-0 cursor-ns-resize touch-none place-items-center"
          >
            <span className="h-1.5 w-12 rounded-full bg-ink-soft/60" />
          </div>
          <div className="flex flex-wrap items-center gap-1 px-2">
            {ZOOMS.map((z) => (
              <button
                key={z}
                type="button"
                aria-pressed={zoom === z}
                className={btn}
                onClick={() => {
                  if (!isZoom(z)) return
                  magnifierTool.set({ on, zoom: z, height, target })
                }}
              >
                {z}×
              </button>
            ))}
            <button
              type="button"
              className={btn}
              onClick={() => move(space(pad, target, zoom))}
            >
              {t('ink.magnifier.space')}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() =>
                move(nextLine(pad, target, zoom, controller.view().width))
              }
            >
              {t('ink.magnifier.nextLine')}
            </button>
            <button
              type="button"
              className={`${btn} ml-auto`}
              aria-label={t('ink.magnifier.close')}
              onClick={() =>
                magnifierTool.set({ on: false, zoom, height, target })
              }
            >
              ✕
            </button>
          </div>
          <div
            ref={padRef}
            data-magnifier-pad
            role="application"
            aria-label={t('ink.magnifier.pad')}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="relative m-2 mt-1 min-h-0 flex-1 touch-none select-none overflow-hidden rounded-xl border border-line bg-soft"
          >
            <canvas
              ref={canvas}
              className="pointer-events-none absolute inset-0 size-full"
              aria-hidden
            />
            {(!hinted || eraser) && (
              <p
                data-magnifier-hint
                className="pointer-events-none absolute inset-x-3 top-2 text-center text-sm text-ink-soft"
              >
                {eraser ? t('ink.magnifier.erasing') : t('ink.magnifier.hint')}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

const pressure = (e: { pressure: number }): number =>
  e.pressure > 0 ? Math.min(1, e.pressure / 0.6) : 0.5
