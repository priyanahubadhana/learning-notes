import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n/t'
import { clampAt, edgePlace, snapSide } from './minimise'
import { useTopLayer } from './useTopLayer'
import './shell-parts.css'

const MOVED_PX = 6

/**
 * SH-13: the edge handle. A small tab on the left or right edge that brings
 * a hidden bar back. Drag it up or down; on release it snaps to the nearest
 * side and the place is remembered. A tap (or Enter) shows the bar; the
 * arrow keys move it.
 */
export function EdgeHandle({
  label,
  onShow,
}: {
  label: string
  onShow: () => void
}) {
  const place = edgePlace.useValue()
  const layer = useRef<HTMLDivElement | null>(null)
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  useTopLayer(layer)

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current
    if (!s) return
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < MOVED_PX)
      return
    s.moved = true
    setDrag({ x: e.clientX, y: e.clientY })
  }
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current
    start.current = null
    if (s?.moved) {
      edgePlace.set({
        side: snapSide(e.clientX, window.innerWidth),
        at: clampAt(e.clientY / window.innerHeight),
      })
      setDrag(null)
    } else onShow()
  }
  const keys = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.key === 'ArrowUp' ? -0.05 : e.key === 'ArrowDown' ? 0.05 : 0
    if (step) {
      e.preventDefault()
      edgePlace.set({ ...place, at: clampAt(place.at + step) })
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      edgePlace.set({
        ...place,
        side: e.key === 'ArrowLeft' ? 'left' : 'right',
      })
    }
  }
  const side = drag ? snapSide(drag.x, window.innerWidth) : place.side
  const top = drag ? drag.y - 32 : place.at * window.innerHeight - 32
  return createPortal(
    <div ref={layer} popover="manual" className="sh-layer">
      <button
        type="button"
        className="sh-edge"
        data-testid="edge-handle"
        data-edge={side}
        aria-label={t('shell.chip.show', { name: label })}
        style={{ top }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          start.current = null
          setDrag(null)
        }}
        onKeyDown={keys}
        onClick={(e) => {
          // A keyboard Enter or Space arrives as a click with no pointer.
          if (e.detail === 0) onShow()
        }}
      >
        {side === 'right' ? '‹' : '›'}
      </button>
    </div>,
    document.body,
  )
}
