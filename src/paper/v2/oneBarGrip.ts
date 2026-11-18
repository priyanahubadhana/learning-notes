import { useRef, useState, type PointerEvent } from 'react'
import { dockArea } from './oneBarArea'
import {
  placeAfterDrop,
  zoneAt,
  type BarPlace,
  type BarSide,
} from './oneBarDockModel'

/**
 * Moving the one bar by its grip (box bar part B). While it is held the page
 * shows dashed drop zones on its four sides; the bar follows the finger; on
 * release inside a zone it docks there, anywhere else it stays where it was
 * dropped. The grip is the only thing that moves it: a tap on the bar never does.
 */
export function useGripDrag({
  bar,
  onLive,
  onDrop,
}: {
  bar: () => HTMLElement | null
  /** The bar's top-left while it is held, null when it is let go. */
  onLive: (at: { left: number; top: number } | null) => void
  onDrop: (p: Pick<BarPlace, 'side' | 'left' | 'top'>) => void
}) {
  const [zone, setZone] = useState<BarSide | null>(null)
  const [dragging, setDragging] = useState(false)
  const grab = useRef<{ dx: number; dy: number } | null>(null)
  const last = useRef<{ left: number; top: number }>({ left: 0, top: 0 })

  const free = (e: PointerEvent) => {
    const g = grab.current
    const el = bar()
    if (!g || !el) return last.current
    const a = dockArea()
    const w = el.offsetWidth
    const h = el.offsetHeight
    return {
      left: Math.max(a.left + 8, Math.min(a.right - 8 - w, e.clientX - g.dx)),
      top: Math.max(a.top + 8, Math.min(a.bottom - 8 - h, e.clientY - g.dy)),
    }
  }
  const end = (e: PointerEvent, drop: boolean) => {
    if (!grab.current) return
    const at = free(e)
    const a = dockArea()
    grab.current = null
    setDragging(false)
    setZone(null)
    onLive(null)
    if (drop) onDrop(placeAfterDrop({ x: e.clientX, y: e.clientY }, at, a))
  }
  return {
    dragging,
    zone,
    gripProps: {
      style: { touchAction: 'none' as const },
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        const el = bar()
        if (!el || e.button > 0) return
        e.preventDefault()
        e.stopPropagation()
        const r = el.getBoundingClientRect()
        grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
        e.currentTarget.setPointerCapture(e.pointerId)
        last.current = { left: r.left, top: r.top }
        setDragging(true)
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (!grab.current) return
        last.current = free(e)
        setZone(zoneAt({ x: e.clientX, y: e.clientY }, dockArea()))
        onLive(last.current)
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => end(e, true),
      onPointerCancel: (e: PointerEvent<HTMLElement>) => end(e, false),
    },
  }
}
