// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/**
 * Replays a trace copied from the circle recorder (src/editor/circleRecorder.ts,
 * Settings > Try new features > Circle recorder) on a page: the recorded
 * pointer, touch, mouse and click events, in the same order and at the same
 * time offsets (counted on the animation-frame clock), each sent to whatever
 * element is under its point at that moment (as a device does). A real iPad
 * circle or tap sequence the owner sends becomes a test with this. Results of
 * the page (selectionchange, preventDefault calls, the final selection) are
 * NOT replayed; they are what the test checks.
 *
 * `dx` / `dy` move every point, so a trace made on another layout can be put
 * over the word under test. A coalesced move is sent as one move per point.
 */
export type TraceEventIn = {
  type: string
  t: number
  pointerType?: string
  id?: number
  x?: number
  y?: number
  co?: [number, number][]
  touches?: { x: number; y: number; touchType?: string; id: number }[]
  detail?: number
}
export type TraceIn = { version: 1; events: TraceEventIn[] }

/** The box of the pen path, to place the trace on a word. */
export function traceBounds(trace: TraceIn): {
  x: number
  y: number
  width: number
  height: number
} {
  const pts = trace.events
    .filter((e) => e.pointerType === 'pen' && e.x !== undefined)
    .flatMap((e) => e.co ?? [[e.x!, e.y!] as [number, number]])
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
): Promise<void> {
  await page.evaluate(
    async ({ events, dx, dy }) => {
      const REPLAYED = new Set([
        'pointerdown',
        'pointermove',
        'pointerup',
        'pointercancel',
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
      const list = events.filter((e) => REPLAYED.has(e.type))
      if (list.length === 0) return
      const start = performance.now()
      const base = list[0].t
      let down = false
      for (const ev of list) {
        const due = start + (ev.t - base)
        while (performance.now() < due)
          await new Promise((r) => requestAnimationFrame(r))
        const send = (type: string, x: number, y: number) => {
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
          if (type.startsWith('pointer')) {
            target.dispatchEvent(
              new PointerEvent(type, {
                ...init,
                pointerId: ev.id ?? 1,
                pointerType: ev.pointerType ?? 'pen',
                isPrimary: true,
                button: type === 'pointermove' ? -1 : 0,
                buttons: down ? 1 : 0,
                pressure: down ? 0.5 : 0,
              }),
            )
          } else if (type.startsWith('touch')) {
            const e = new Event(type, { bubbles: true, cancelable: true })
            const touches = (ev.touches ?? []).map((c) => ({
              identifier: c.id,
              clientX: c.x + dx,
              clientY: c.y + dy,
              touchType: c.touchType,
            }))
            Object.defineProperty(e, 'changedTouches', { value: touches })
            Object.defineProperty(e, 'touches', { value: [] })
            const where = document.elementFromPoint(
              touches[0]?.clientX ?? px,
              touches[0]?.clientY ?? py,
            )
            ;(where ?? document.body).dispatchEvent(e)
          } else {
            target.dispatchEvent(
              new MouseEvent(type, { ...init, detail: ev.detail ?? 1 }),
            )
          }
        }
        if (ev.type === 'pointerdown') down = true
        const x0 = ev.x ?? ev.touches?.[0]?.x ?? 0
        const y0 = ev.y ?? ev.touches?.[0]?.y ?? 0
        if (ev.type === 'pointermove' && ev.co?.length) {
          for (const [x, y] of ev.co) send(ev.type, x, y)
        } else send(ev.type, x0, y0)
        if (ev.type === 'pointerup' || ev.type === 'pointercancel') down = false
      }
    },
    { events: trace.events, dx: at.dx ?? 0, dy: at.dy ?? 0 },
  )
}
