import { useEffect, useRef } from 'react'
import { getGestureRouter } from '../../app/input/gestureRouter'
import type { Annotation } from '../../core/types'
import { createHoldTap } from './holdTap'
import { edgeScrollSpeed, stickyLift } from './sticky'

/** The click a browser sends after a long-press drag must not open the note. */
export const stickyHold = createHoldTap()

/** Where a viewport point lands on a PDF page: page number and 0 to 1 place. */
export function pageUnder(
  x: number,
  y: number,
): { page: number; x: number; y: number } | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const host = el.closest('[data-pdf-page]')
    if (!(host instanceof HTMLElement)) continue
    const r = host.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return {
      page: Number(host.dataset.pdfPage),
      x: (x - r.left) / r.width,
      y: (y - r.top) / r.height,
    }
  }
  return null
}

/**
 * A long-press on a sticky pin lifts it (RD-B33); it follows the pointer, the
 * page scrolls near the top or bottom edge, and letting go drops it on the
 * page under the pointer. A short tap never gets here. Pointer handling goes
 * through the app's gesture router.
 */
export function useStickyDrag(opts: {
  enabled: boolean
  note: (id: string) => Annotation | undefined
  onDrop: (a: Annotation, to: { page: number; x: number; y: number }) => void
  onLift: () => void
}) {
  const latest = useRef(opts)
  useEffect(() => {
    latest.current = opts
  })
  useEffect(() => {
    let raf = 0
    let last = { x: 0, y: 0 }
    const scroller = () =>
      document.querySelector<HTMLElement>('[data-testid="pdf-scroller"]')
    const tick = () => {
      const s = scroller()
      if (s) {
        const r = s.getBoundingClientRect()
        const v = edgeScrollSpeed(last.y, r.top, r.bottom)
        if (v !== 0) s.scrollTop += v
      }
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const off = getGestureRouter().register({
      id: 'sticky-lift',
      claim: (g) => {
        if (!latest.current.enabled) return null
        if (!(g.target instanceof Element)) return null
        return g.target.closest('[data-sticky-pin]') ? 'longpress' : null
      },
      onStart: (g) => {
        const el = (g.target as Element).closest('[data-sticky-pin]')
        const id = el instanceof HTMLElement ? el.dataset.stickyPin : undefined
        if (!id) return
        stickyHold.hold()
        last = { x: g.x, y: g.y }
        stickyLift.set({ id, x: g.x, y: g.y })
        latest.current.onLift()
        raf = requestAnimationFrame(tick)
      },
      onMove: (_g, e) => {
        last = { x: e.clientX, y: e.clientY }
        const cur = stickyLift.get()
        if (cur) stickyLift.set({ ...cur, x: e.clientX, y: e.clientY })
      },
      onEnd: (_g, reason) => {
        stop()
        const cur = stickyLift.get()
        stickyLift.set(null)
        stickyHold.end()
        if (!cur || reason !== 'done') return
        const a = latest.current.note(cur.id)
        const to = pageUnder(cur.x, cur.y)
        if (a && to) latest.current.onDrop(a, to)
      },
    })
    return () => {
      off()
      stop()
      stickyLift.set(null)
    }
  }, [])
}
