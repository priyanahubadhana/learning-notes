import { useRef, useState, type PointerEvent, type SyntheticEvent } from 'react'
import { onRouted, PRIORITY } from '../../app/input/eventRouter'
import { dockArea } from './oneBarArea'
import {
  HOLD_AFTER_MS,
  isTap,
  zoneForBar,
  type BarPlace,
  type BarSide,
} from './oneBarDockModel'

let releaseTimer: ReturnType<typeof setTimeout> | undefined
/** The pointers that are down right now, by id (the shield must not flip under a press, #62). */
const pressed = new Set<number>()
let watching = false
/** Longest the shield lasts after a drop when a press seems still down (ms): a lost lift must not freeze the page. */
export const SHIELD_WAIT_MAX_MS = 2000
function watchPresses() {
  if (watching) return
  watching = true
  // Through the app's event router (the ratchet: no raw listeners). Highest
  // priority, and it never handles the event, so every later handler still
  // gets it.
  const o = { priority: SHIELD_WATCH_PRIORITY, name: 'oneBarGrip.presses' }
  onRouted('pointerdown', (e) => void pressed.add(e.pointerId), o)
  const up = (e: globalThis.PointerEvent) => void pressed.delete(e.pointerId)
  onRouted('pointerup', up, o)
  onRouted('pointercancel', up, o)
  // A lift eaten by a context menu or a lost window never comes (the router's
  // "background" is a blur, a hidden page or a pagehide).
  onRouted('background', () => void pressed.clear(), o)
}
/** Above every router priority, so a handler that stops a press cannot hide it from the shield. */
const SHIELD_WATCH_PRIORITY = PRIORITY.gesture + 1000
/**
 * The page under the bar gets no touch while the grip is held and for a moment
 * after (the click an iPad sends after a touch must not land on the words
 * under the bar). Module level: it outlives the grip, which may unmount on a drop.
 * The shield does not end while a press is down (a Pencil tap on the pin that
 * straddles the end would lose its lift to the page behind, #62), but ends at
 * most SHIELD_WAIT_MAX_MS for it.
 */
function shield(on: boolean) {
  const root = document.documentElement
  clearTimeout(releaseTimer)
  watchPresses()
  if (on) root.setAttribute('data-bar-dragging', '')
  else {
    const until = performance.now() + SHIELD_WAIT_MAX_MS
    const release = () => {
      if (pressed.size > 0 && performance.now() < until)
        releaseTimer = setTimeout(release, 50)
      else root.removeAttribute('data-bar-dragging')
    }
    releaseTimer = setTimeout(release, HOLD_AFTER_MS)
  }
}

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
  const lastZone = useRef<BarSide | null>(null)
  // Where the finger came down, and whether it has travelled past a tap.
  const down = useRef<{ x: number; y: number } | null>(null)
  const moving = useRef(false)

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
  // The side the bar's leading edge (or else the pointer) is in (#61).
  const zoneOf = (e: PointerEvent, at: { left: number; top: number }) => {
    const el = bar()
    const d = down.current
    const bx = {
      left: at.left,
      top: at.top,
      right: at.left + (el?.offsetWidth ?? 0),
      bottom: at.top + (el?.offsetHeight ?? 0),
    }
    return zoneForBar(
      bx,
      d ? { x: e.clientX - d.x, y: e.clientY - d.y } : { x: 0, y: 0 },
      dockArea(),
      { x: e.clientX, y: e.clientY },
    )
  }
  const end = (e: PointerEvent, drop: boolean) => {
    if (!grab.current) return
    const travelled = moving.current
    const landed = travelled ? zoneOf(e, free(e)) : null
    moving.current = false
    down.current = null
    shield(false)
    if (!travelled) {
      // A tap on the grip moves nothing: no drop, no remount, the press ends here.
      grab.current = null
      return
    }
    const at = free(e)
    // A touch the system cancels (a finger at the very edge of the iPad) still
    // docks where the finger was last seen, when that was a side zone (#61).
    const seen = lastZone.current
    grab.current = null
    lastZone.current = null
    setDragging(false)
    setZone(null)
    onLive(null)
    if (drop) onDrop({ side: landed ?? 'free', ...at })
    else if (seen && seen !== 'free') onDrop({ side: seen, ...at })
  }
  // The grip never reaches the editor under it: no caret, no selection, no focus.
  const stop = (e: SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  return {
    dragging,
    zone,
    gripProps: {
      style: {
        touchAction: 'none' as const,
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
      },
      // The compatibility events a touch makes after the pointer ones.
      onMouseDown: stop,
      onTouchEnd: stop,
      onClick: stop,
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        const el = bar()
        if (!el || e.button > 0) return
        stop(e)
        lastZone.current = null
        const r = el.getBoundingClientRect()
        grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
        e.currentTarget.setPointerCapture(e.pointerId)
        last.current = { left: r.left, top: r.top }
        down.current = { x: e.clientX, y: e.clientY }
        moving.current = false
        shield(true)
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (!grab.current) return
        if (!moving.current) {
          if (
            down.current &&
            isTap(down.current, { x: e.clientX, y: e.clientY })
          )
            return
          moving.current = true
          setDragging(true)
        }
        last.current = free(e)
        const z = zoneOf(e, last.current)
        lastZone.current = z
        setZone(z)
        onLive(last.current)
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => end(e, true),
      onPointerCancel: (e: PointerEvent<HTMLElement>) => end(e, false),
    },
  }
}

/**
 * A menu surface (the bar, its strips, the ⋯ list): a touch or Pencil press on
 * it never reaches the page behind, so no selection, no caret move, no Scribble
 * ink starts under it (issue #62). The text cursor stays where it was.
 */
export const holdPage = {
  onPointerDown: (e: SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: SyntheticEvent) => e.stopPropagation(),
  onMouseDown: (e: SyntheticEvent) => {
    const el = e.target as Element
    if (el.closest('input, textarea, [contenteditable="true"]')) return
    if (document.activeElement?.closest('.ProseMirror')) e.preventDefault()
  },
}
