import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { penSettings } from '../app/tools/main/inkSettings'
import { t } from '../i18n/t'
import type { InkController } from './controller'
import {
  advanceTarget,
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
 * The Magnifier (G1): a big pad at the bottom of the screen. Write large in
 * it; each stroke lands small in the dashed target box on the page. The box
 * moves on by itself when the writing nears the pad's right edge, and by
 * hand with Space and Next line. A finger, the Pencil and a mouse all work
 * in the pad. The strokes are ordinary ink (one Undo each).
 */

interface PadPoint {
  x: number
  y: number
  p: number
  t: number
}

export function MagnifierView({
  controller,
  wrap,
}: {
  controller: InkController
  wrap: HTMLElement
}) {
  const { on, zoom, target } = magnifierTool.useValue()
  const [pad, setPad] = useState<Pad>({ w: 600, h: 140 })
  const padEl = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // The strokes written in the current box (pad px), shown in the pad.
  const strokes = useRef<PadPoint[][]>([])
  const current = useRef<PadPoint[] | null>(null)
  const t0 = useRef(0)

  // Where the box starts: near the top of what is on screen.
  useEffect(() => {
    if (on && !target) {
      const v = controller.view()
      magnifierTool.set({
        on,
        zoom,
        target: { x: 24, y: v.top + 120 },
      })
    }
  }, [on, target, zoom, controller])

  useLayoutEffect(() => {
    const el = padEl.current
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
  }, [on])

  const redraw = () => {
    const c = canvas.current
    const g = c?.getContext('2d')
    if (!c || !g) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(pad.w * dpr)
    c.height = Math.round(pad.h * dpr)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, pad.w, pad.h)
    g.strokeStyle = penSettings.get().colour
    g.lineWidth = 3
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (const s of [...strokes.current, current.current ?? []]) {
      if (s.length === 0) continue
      g.beginPath()
      g.moveTo(s[0].x, s[0].y)
      for (const q of s) g.lineTo(q.x, q.y)
      if (s.length === 1) g.lineTo(s[0].x + 0.1, s[0].y)
      g.stroke()
    }
  }
  useLayoutEffect(redraw)

  if (!on || !target) return null
  const box = targetSize(pad, zoom)
  const move = (to: typeof target) =>
    magnifierTool.set({ on, zoom, target: to })

  const local = (e: { clientX: number; clientY: number }) => {
    const b = padEl.current!.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }
  const onDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test).
    }
    t0.current = e.timeStamp
    current.current = [{ ...local(e), p: pressure(e), t: 0 }]
    redraw()
  }
  const onMove = (e: ReactPointerEvent) => {
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
    const stroke = current.current
    current.current = null
    if (!stroke || stroke.length === 0) return
    strokes.current.push(stroke)
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
    if (next) {
      strokes.current = []
      move(next)
    }
    redraw()
  }

  // The dashed box on the page, with a handle to drag it.
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
      strokes.current = []
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

  const btn =
    'min-h-11 rounded-lg px-3 text-sm text-ink hover:bg-hover aria-pressed:bg-accent aria-pressed:text-white'
  return (
    <>
      <div
        data-magnifier-target
        aria-hidden
        className="pointer-events-none absolute rounded-sm border-2 border-dashed border-accent"
        style={{ left: target.x, top: target.y, width: box.w, height: box.h }}
      >
        <button
          type="button"
          tabIndex={-1}
          data-ink-handles
          data-magnifier-handle
          aria-label={t('ink.magnifier.moveBox')}
          title={t('ink.magnifier.moveBox')}
          onPointerDown={dragBox}
          className="pointer-events-auto absolute -left-5 -top-5 grid size-11 touch-none place-items-center"
        >
          <span className="grid size-6 place-items-center rounded-full border-2 border-accent bg-bg text-xs text-accent">
            ⠿
          </span>
        </button>
      </div>
      {createPortal(
        <div
          role="group"
          aria-label={t('ink.magnifier')}
          data-chrome
          data-magnifier
          className="fixed bottom-2 left-1/2 z-[60] flex w-[min(96vw,760px)] -translate-x-1/2 flex-col rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
        >
          <div className="flex flex-wrap items-center gap-1 px-1">
            {ZOOMS.map((z) => (
              <button
                key={z}
                type="button"
                aria-pressed={zoom === z}
                className={btn}
                onClick={() => {
                  if (!isZoom(z)) return
                  strokes.current = []
                  magnifierTool.set({ on, zoom: z, target })
                }}
              >
                {z}×
              </button>
            ))}
            <button
              type="button"
              className={btn}
              onClick={() => {
                strokes.current = []
                move(space(pad, target, zoom))
              }}
            >
              {t('ink.magnifier.space')}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                strokes.current = []
                move(nextLine(pad, target, zoom, 24))
              }}
            >
              {t('ink.magnifier.nextLine')}
            </button>
            <button
              type="button"
              className={`${btn} ml-auto`}
              aria-label={t('ink.magnifier.close')}
              onClick={() => magnifierTool.set({ on: false, zoom, target })}
            >
              ✕
            </button>
          </div>
          <div
            ref={padEl}
            data-magnifier-pad
            role="application"
            aria-label={t('ink.magnifier.pad')}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="relative m-1 h-36 touch-none overflow-hidden rounded-xl border border-line bg-soft"
          >
            <canvas
              ref={canvas}
              className="pointer-events-none absolute inset-0 size-full"
              aria-hidden
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

const pressure = (e: { pressure: number }): number =>
  e.pressure > 0 ? Math.min(1, e.pressure / 0.6) : 0.5
