// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/**
 * Replays a trace copied from the quiet recorder (src/app/input/lassoRecorder.ts,
 * Settings > Try new features > Lasso recorder, "Copy last trace") on a page,
 * and also the older traces of the red-line Circle recorder (version 1).
 *
 * RC-06: the replay sends what the trace holds: pointer type and id, primary,
 * button and buttons, real pressure, tilt, width and height, the coalesced
 * points of a pen move, touch events with their touches, mouse events and
 * clicks, and the hover (over, out, enter, leave). Time is the trace's own
 * performance clock, counted on the animation-frame clock. Nothing is made up
 * for a version 2 trace; only a version 1 trace (which never held pressure or
 * buttons) gets the old guesses (pressure 0.5, button 0, buttons 1 while down).
 *
 * NOT replayed, because the page makes them as a result: pointer capture
 * gained and lost, focus and blur, selection change, text input and the
 * machine state entries. Every replayed event is untrusted (isTrusted false):
 * Scribble and the browser's own selection never react to it, so a replay can
 * not exercise Scribble (stated in quietRecorder.spec.ts). Each event goes to
 * whatever element is under its point at that moment, as a device does.
 *
 * `dx` / `dy` move every point, so a trace made on another layout can be put
 * over the word under test.
 */
export type TraceTouch = { i: number; x: number; y: number; k?: string }
export type TraceEventIn = {
  /** Version 2: the event type, the performance clock, and pointer fields. */
  e?: string
  p?: number
  pid?: number
  pt?: string
  pri?: number
  b?: number
  bs?: number
  pres?: number
  tx?: number
  ty?: number
  w?: number
  h?: number
  /** Version 2 coalesced points, flat x,y,x,y (version 1: pairs). */
  co?: number[] | [number, number][]
  tc?: number
  ch?: TraceTouch[]
  d?: number
  /** Version 1 fields. */
  type?: string
  t?: number
  pointerType?: string
  id?: number
  x?: number
  y?: number
  touches?: { x: number; y: number; touchType?: string; id: number }[]
  detail?: number
  /** The app state the recorder saw with this event (version 2). */
  st?: Record<string, unknown>
}
export type TraceIn = {
  version?: 1
  v?: 2
  events: TraceEventIn[]
  /** The Lasso state when the trace was copied (version 2). */
  end?: Record<string, unknown>
}

/** One event the page sends, the same shape for both versions. */
type Send = {
  type: string
  at: number
  ptype: string
  id: number
  primary: boolean
  button: number
  buttons: number
  pressure: number
  tiltX: number
  tiltY: number
  width: number
  height: number
  x: number
  y: number
  co: [number, number][]
  touches: { id: number; x: number; y: number; k?: string }[]
  detail: number
}

const SENT = new Set([
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave',
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
  'contextmenu',
])

const pairs = (co: number[] | [number, number][] | undefined) => {
  if (!co || co.length === 0) return []
  if (Array.isArray(co[0])) return co as [number, number][]
  const flat = co as number[]
  const out: [number, number][] = []
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i], flat[i + 1]])
  return out
}

/** Reads either version into the events the page sends. */
export function toSends(trace: TraceIn): Send[] {
  const v2 = trace.v === 2
  const list = trace.events.filter((ev) =>
    SENT.has((v2 ? ev.e : ev.type) ?? ''),
  )
  return list.map((ev) => {
    const touches = v2
      ? (ev.ch ?? []).map((c) => ({ id: c.i, x: c.x, y: c.y, k: c.k }))
      : (ev.touches ?? []).map((c) => ({
          id: c.id,
          x: c.x,
          y: c.y,
          k: c.touchType,
        }))
    const first = touches[0]
    return {
      type: (v2 ? ev.e : ev.type)!,
      at: (v2 ? ev.p : ev.t) ?? 0,
      ptype: (v2 ? ev.pt : ev.pointerType) ?? 'pen',
      id: (v2 ? ev.pid : ev.id) ?? 1,
      primary: v2 ? ev.pri !== 0 : true,
      // Version 1 never held these: -2 tells the page to guess them.
      button: v2 ? (ev.b ?? 0) : -2,
      buttons: v2 ? (ev.bs ?? 0) : -2,
      pressure: v2 ? (ev.pres ?? 0) : -2,
      tiltX: ev.tx ?? 0,
      tiltY: ev.ty ?? 0,
      width: ev.w ?? 1,
      height: ev.h ?? 1,
      x: ev.x ?? first?.x ?? 0,
      y: ev.y ?? first?.y ?? 0,
      co: pairs(ev.co),
      touches,
      detail: (v2 ? ev.d : ev.detail) ?? 1,
    }
  })
}

/** The box of the pen path, to place the trace on a word. */
export function traceBounds(trace: TraceIn): {
  x: number
  y: number
  width: number
  height: number
} {
  const pts = toSends(trace)
    .filter((e) => e.ptype === 'pen' && e.type.startsWith('pointer'))
    .flatMap((e) => (e.co.length ? e.co : [[e.x, e.y] as [number, number]]))
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

export async function replayTrace(
  page: Page,
  trace: TraceIn,
  at: { dx?: number; dy?: number } = {},
): Promise<{ sent: number }> {
  const events = toSends(trace)
  return page.evaluate(
    async ({ events, dx, dy }) => {
      if (events.length === 0) return { sent: 0 }
      const start = performance.now()
      const base = events[0].at
      let down = false
      let sent = 0
      for (const ev of events) {
        const due = start + (ev.at - base)
        while (performance.now() < due)
          await new Promise((r) => requestAnimationFrame(r))
        const send = (x: number, y: number) => {
          const px = x + dx
          const py = y + dy
          const target = document.elementFromPoint(px, py) ?? document.body
          const init = {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: px,
            clientY: py,
          }
          sent++
          if (ev.type.startsWith('pointer')) {
            const guess = ev.pressure === -2
            const noBubble = /enter|leave/.test(ev.type)
            target.dispatchEvent(
              new PointerEvent(ev.type, {
                ...init,
                bubbles: !noBubble,
                cancelable: !noBubble,
                pointerId: ev.id,
                pointerType: ev.ptype,
                isPrimary: ev.primary,
                button: guess
                  ? ev.type === 'pointermove'
                    ? -1
                    : 0
                  : ev.button,
                buttons: guess ? (down ? 1 : 0) : ev.buttons,
                pressure: guess ? (down ? 0.5 : 0) : ev.pressure,
                tiltX: ev.tiltX,
                tiltY: ev.tiltY,
                width: ev.width,
                height: ev.height,
              }),
            )
          } else if (ev.type.startsWith('touch')) {
            const e = new Event(ev.type, { bubbles: true, cancelable: true })
            const touches = ev.touches.map((c) => ({
              identifier: c.id,
              clientX: c.x + dx,
              clientY: c.y + dy,
              touchType: c.k,
            }))
            const active = /end|cancel/.test(ev.type) ? [] : touches
            Object.defineProperty(e, 'changedTouches', { value: touches })
            Object.defineProperty(e, 'touches', { value: active })
            const where = document.elementFromPoint(
              touches[0]?.clientX ?? px,
              touches[0]?.clientY ?? py,
            )
            ;(where ?? document.body).dispatchEvent(e)
          } else {
            target.dispatchEvent(
              new MouseEvent(ev.type, { ...init, detail: ev.detail }),
            )
          }
        }
        if (ev.type === 'pointerdown') down = true
        if (ev.type === 'pointermove' && ev.co.length)
          for (const [x, y] of ev.co) send(x, y)
        else send(ev.x, ev.y)
        if (ev.type === 'pointerup' || ev.type === 'pointercancel') down = false
      }
      return { sent }
    },
    { events, dx: at.dx ?? 0, dy: at.dy ?? 0 },
  )
}
