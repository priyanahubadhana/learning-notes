import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drag a task onto a box (F1). Mouse and Pencil lift at once; a finger
 * lifts after a 0.4 s press that stays put (so the page still scrolls).
 * The drop target is the nearest element with `data-drop` under the pointer
 * (its value is passed to `onDrop`). Keyboard and VoiceOver use the task's
 * "Move to…" menu instead, so nothing needs a drag.
 */

export const LIFT_MS = 400
const MOVE_SLOP = 8

export interface DragState {
  id: string
  x: number
  y: number
  /** The `data-drop` value under the pointer, or null. */
  over: string | null
}

export function dropAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)
  const target = el?.closest<HTMLElement>('[data-drop]')
  return target?.dataset.drop ?? null
}

export function useTaskDrag(onDrop: (id: string, target: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const state = useRef<{
    id: string
    pointerId: number
    startX: number
    startY: number
    lifted: boolean
    /** The pointer travelled far enough to count as a drag (not a click). */
    moved: boolean
    timer: ReturnType<typeof setTimeout> | null
  } | null>(null)
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  })

  const finish = useCallback((drop: boolean, x: number, y: number) => {
    const s = state.current
    if (!s) return
    if (s.timer) clearTimeout(s.timer)
    state.current = null
    if (s.lifted && s.moved && drop) {
      const target = dropAt(x, y)
      if (target) onDropRef.current(s.id, target)
    }
    setDrag(null)
  }, [])

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = state.current
      if (!s || e.pointerId !== s.pointerId) return
      if (!s.lifted) {
        // A finger that moves before the lift is scrolling, not dragging.
        if (
          Math.hypot(e.clientX - s.startX, e.clientY - s.startY) > MOVE_SLOP
        ) {
          if (s.timer) clearTimeout(s.timer)
          state.current = null
        }
        return
      }
      if (Math.hypot(e.clientX - s.startX, e.clientY - s.startY) > MOVE_SLOP) {
        s.moved = true
      }
      if (!s.moved) return
      setDrag({
        id: s.id,
        x: e.clientX,
        y: e.clientY,
        over: dropAt(e.clientX, e.clientY),
      })
    }
    const up = (e: PointerEvent) => {
      if (state.current && e.pointerId === state.current.pointerId) {
        finish(true, e.clientX, e.clientY)
      }
    }
    const cancel = (e: PointerEvent) => {
      if (state.current && e.pointerId === state.current.pointerId) {
        finish(false, 0, 0)
      }
    }
    // Once lifted, the page must not scroll under the finger.
    const touchMove = (e: TouchEvent) => {
      if (state.current?.lifted && e.cancelable) e.preventDefault()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false, 0, 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('touchmove', touchMove, { passive: false })
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('keydown', key)
    }
  }, [finish])

  /** Props for the draggable part of a row. */
  const handlers = (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 || state.current) return
      if ((e.target as HTMLElement).closest('button, input, a, select')) return
      const s = {
        id,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lifted: e.pointerType !== 'touch',
        moved: false,
        timer: null as ReturnType<typeof setTimeout> | null,
      }
      state.current = s
      if (e.pointerType === 'touch') {
        s.timer = setTimeout(() => {
          if (state.current !== s) return
          s.lifted = true
          setDrag({
            id,
            x: s.startX,
            y: s.startY,
            over: dropAt(s.startX, s.startY),
          })
        }, LIFT_MS)
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (state.current?.lifted) e.preventDefault()
    },
  })

  // A mouse press that never moves is a click, not a drag: only show the
  // ghost once the pointer has moved (set by `move`).
  return { drag, handlers }
}
