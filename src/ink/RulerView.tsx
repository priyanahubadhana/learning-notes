import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { t } from '../i18n/t'
import type { InkController } from './controller'
import {
  angleDegrees,
  newRuler,
  RULER_H,
  RULER_MAX,
  RULER_MIN,
  snapAngle,
  type RulerState,
} from './ruler'
import { rulerTool } from './toolState'

/**
 * The ruler bar over the page (G1). The bar is a solid object (owner, iPad,
 * 7 Nov: dragging it used to select the text under it): one finger or the
 * Pencil anywhere on it moves it at once, a second finger twists it (as the
 * Markup ruler does), either end handle turns and stretches it (it clicks to
 * 0, 45, 90 and 135 degrees). A pen that starts at one of its long edges
 * slides along it (see controller.ts). Nothing on the bar reaches the page.
 */
export function RulerView({
  controller,
  wrap,
}: {
  controller: InkController
  wrap: HTMLElement
}) {
  const { on, ruler } = rulerTool.useValue()
  useEffect(() => {
    if (on && !ruler) {
      const v = controller.view()
      rulerTool.set({ on, ruler: newRuler(v.width, v.top) })
    }
  }, [on, ruler, controller])
  // The pointers on the bar's body (one moves, two twist).
  const body = useRef<{
    start: RulerState
    pts: Map<number, { x: number; y: number }>
    from: { x: number; y: number }[]
  } | null>(null)
  if (!on || !ruler) return null

  const local = (e: { clientX: number; clientY: number }) => {
    const b = wrap.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }

  const grab = (how: 'end' | 'start') => (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test).
    }
    const start = ruler
    const move = (m: PointerEvent) => {
      const p = local(m)
      // An end follows the pointer: the other end stays where it was.
      const sign = how === 'end' ? 1 : -1
      const fixed = {
        x: start.cx - Math.cos(start.angle) * (start.len / 2) * sign,
        y: start.cy - Math.sin(start.angle) * (start.len / 2) * sign,
      }
      const dx = (p.x - fixed.x) * sign
      const dy = (p.y - fixed.y) * sign
      const len = Math.min(RULER_MAX, Math.max(RULER_MIN, Math.hypot(dx, dy)))
      const angle = snapAngle(Math.atan2(dy, dx))
      rulerTool.set({
        on: true,
        ruler: {
          angle,
          len,
          cx: fixed.x + Math.cos(angle) * (len / 2) * sign,
          cy: fixed.y + Math.sin(angle) * (len / 2) * sign,
        },
      })
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  /** The body: the first pointer moves the bar, a second one twists it. */
  const bodyDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test).
    }
    const p = local(e)
    const b = body.current
    if (!b) {
      body.current = {
        start: ruler,
        pts: new Map([[e.pointerId, p]]),
        from: [p],
      }
    } else if (b.pts.size === 1) {
      b.pts.set(e.pointerId, p)
      b.start = rulerTool.get().ruler ?? b.start
      b.from = [...b.pts.values()]
    }
  }
  const bodyMove = (e: ReactPointerEvent) => {
    const b = body.current
    if (!b || !b.pts.has(e.pointerId)) return
    e.preventDefault()
    b.pts.set(e.pointerId, local(e))
    const now = [...b.pts.values()]
    const { start, from } = b
    if (now.length < 2) {
      rulerTool.set({
        on: true,
        ruler: {
          ...start,
          cx: start.cx + (now[0].x - from[0].x),
          cy: start.cy + (now[0].y - from[0].y),
        },
      })
      return
    }
    // Two fingers: the bar turns by the angle the fingers turned and moves
    // with their middle.
    const a0 = Math.atan2(from[1].y - from[0].y, from[1].x - from[0].x)
    const a1 = Math.atan2(now[1].y - now[0].y, now[1].x - now[0].x)
    const mid = (q: { x: number; y: number }[]) => ({
      x: (q[0].x + q[1].x) / 2,
      y: (q[0].y + q[1].y) / 2,
    })
    const m0 = mid(from)
    const m1 = mid(now)
    rulerTool.set({
      on: true,
      ruler: {
        ...start,
        angle: snapAngle(start.angle + (a1 - a0)),
        cx: start.cx + (m1.x - m0.x),
        cy: start.cy + (m1.y - m0.y),
      },
    })
  }
  const bodyUp = (e: ReactPointerEvent) => {
    const b = body.current
    if (!b || !b.pts.has(e.pointerId)) return
    body.current = null // any finger lifting ends the gesture
  }

  const dx = Math.cos(ruler.angle) * (ruler.len / 2)
  const dy = Math.sin(ruler.angle) * (ruler.len / 2)
  const handle =
    'pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center'
  const knob =
    'grid size-6 place-items-center rounded-full border-2 border-accent bg-bg text-[10px] text-accent'

  return (
    <div data-ruler>
      <div
        role="presentation"
        data-ink-handles
        data-ruler-body
        onPointerDown={bodyDown}
        onPointerMove={bodyMove}
        onPointerUp={bodyUp}
        onPointerCancel={bodyUp}
        className="pointer-events-auto absolute cursor-move touch-none select-none rounded-md border border-ink-soft"
        style={{
          left: ruler.cx - ruler.len / 2,
          top: ruler.cy - RULER_H / 2,
          width: ruler.len,
          height: RULER_H,
          transform: `rotate(${ruler.angle}rad)`,
          transformOrigin: 'center',
          background:
            'repeating-linear-gradient(90deg, var(--color-ink-soft) 0 1px, transparent 1px 10px) top / 100% 8px no-repeat, color-mix(in srgb, var(--color-bg) 60%, transparent)',
        }}
      />
      <span
        aria-hidden
        data-ruler-handle="move"
        className="pointer-events-none absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center"
        style={{ left: ruler.cx, top: ruler.cy }}
      >
        <span className={knob}>{angleDegrees(ruler)}°</span>
      </span>
      {(['start', 'end'] as const).map((end) => (
        <button
          key={end}
          type="button"
          data-ink-handles
          data-ruler-handle={end}
          aria-label={t('ink.ruler.turn')}
          onPointerDown={grab(end)}
          className={handle}
          style={{
            left: ruler.cx + (end === 'end' ? dx : -dx),
            top: ruler.cy + (end === 'end' ? dy : -dy),
          }}
        >
          <span className={knob}>↻</span>
        </button>
      ))}
      <button
        type="button"
        data-ink-handles
        data-chrome
        data-ruler-handle="close"
        aria-label={t('ink.ruler.close')}
        onClick={() => rulerTool.set({ on: false, ruler })}
        className={handle}
        style={{
          left:
            ruler.cx +
            Math.cos(ruler.angle) * (ruler.len / 2 - 40) -
            Math.sin(ruler.angle) * (RULER_H / 2 + 18),
          top:
            ruler.cy +
            Math.sin(ruler.angle) * (ruler.len / 2 - 40) +
            Math.cos(ruler.angle) * (RULER_H / 2 + 18),
        }}
      >
        <span className={knob}>✕</span>
      </button>
    </div>
  )
}
