import { useEffect, type PointerEvent as ReactPointerEvent } from 'react'
import { t } from '../i18n/t'
import type { InkController } from './controller'
import {
  angleDegrees,
  newRuler,
  RULER_H,
  RULER_MAX,
  RULER_MIN,
  snapAngle,
} from './ruler'
import { rulerTool } from './toolState'

/**
 * The ruler bar over the page (G1). Drag the centre to move it, drag either
 * end to turn and stretch it (it clicks to 0, 45, 90 and 135 degrees). A pen
 * that starts at one of its long edges slides along it (see controller.ts).
 * The bar itself lets the pen through; only its handles take touches.
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
  if (!on || !ruler) return null

  const local = (e: { clientX: number; clientY: number }) => {
    const b = wrap.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }

  const grab = (how: 'move' | 'end' | 'start') => (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test).
    }
    const from = local(e)
    const start = ruler
    const move = (m: PointerEvent) => {
      const p = local(m)
      if (how === 'move') {
        rulerTool.set({
          on: true,
          ruler: {
            ...start,
            cx: start.cx + (p.x - from.x),
            cy: start.cy + (p.y - from.y),
          },
        })
        return
      }
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

  const dx = Math.cos(ruler.angle) * (ruler.len / 2)
  const dy = Math.sin(ruler.angle) * (ruler.len / 2)
  const handle =
    'pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center'
  const knob =
    'grid size-6 place-items-center rounded-full border-2 border-accent bg-bg text-[10px] text-accent'

  return (
    <div data-ruler>
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-md border border-ink-soft"
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
      <button
        type="button"
        data-ink-handles
        data-ruler-handle="move"
        aria-label={t('ink.ruler.move')}
        title={t('ink.ruler.move')}
        onPointerDown={grab('move')}
        className={handle}
        style={{ left: ruler.cx, top: ruler.cy }}
      >
        <span className={knob}>{angleDegrees(ruler)}°</span>
      </button>
      {(['start', 'end'] as const).map((end) => (
        <button
          key={end}
          type="button"
          data-ink-handles
          data-ruler-handle={end}
          aria-label={t('ink.ruler.turn')}
          title={t('ink.ruler.turn')}
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
        data-ruler-handle="close"
        aria-label={t('ink.ruler.close')}
        title={t('ink.ruler.close')}
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
