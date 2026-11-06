import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'

/** How long a finger or Pencil must stay down (ms). */
export const LONG_PRESS_MS = 500
/** A move of more than this many pixels cancels the long-press. */
export const LONG_PRESS_SLOP = 8

/**
 * Pure state machine behind `useLongPress` (kept apart so it can be tested
 * without a browser). `down` starts, `move` may cancel, `up` ends. After a
 * long-press fired, the next click must be swallowed (`consumeClick`).
 */
export function createLongPress(
  onLong: (x: number, y: number) => void,
  ms = LONG_PRESS_MS,
  slop = LONG_PRESS_SLOP,
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let x0 = 0
  let y0 = 0
  let fired = false
  let handler = onLong
  const cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  return {
    down(x: number, y: number) {
      cancel()
      fired = false
      x0 = x
      y0 = y
      timer = setTimeout(() => {
        timer = null
        fired = true
        handler(x0, y0)
      }, ms)
    },
    move(x: number, y: number) {
      if (timer !== null && Math.hypot(x - x0, y - y0) > slop) cancel()
    },
    up: cancel,
    /** Swap the callback (the latest render's) without restarting. */
    setHandler(fn: (x: number, y: number) => void) {
      handler = fn
    },
    /** True once after a long-press fired: the click that follows is not a tap. */
    consumeClick() {
      const was = fired
      fired = false
      return was
    },
    /** True while a long-press has fired and its click is still pending. */
    get fired() {
      return fired
    },
  }
}

/**
 * Long-press (500 ms, finger or Pencil, not mouse) for a row or a button.
 * Spread the result on the element. A move of more than 8 px cancels it, and
 * the click after a long-press is swallowed so the row does not also open.
 */
export function useLongPress(
  onLong: (x: number, y: number) => void,
  /** Rows: a press that starts on a tipped icon is the icon's own (its tip). */
  ignoreTips = false,
) {
  const [machine] = useState(() => createLongPress(onLong))
  useEffect(() => {
    machine.setHandler(onLong)
  })
  useEffect(() => () => machine.up(), [machine])

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !e.isPrimary) return
      if (ignoreTips && (e.target as Element).closest?.('[data-tip-hold]'))
        return
      machine.down(e.clientX, e.clientY)
    },
    [machine, ignoreTips],
  )
  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      machine.move(e.clientX, e.clientY)
    },
    [machine],
  )
  const end = useCallback(() => machine.up(), [machine])
  const onClickCapture = useCallback(
    (e: MouseEvent) => {
      if (machine.consumeClick()) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    [machine],
  )
  const onContextMenu = useCallback(
    (e: MouseEvent) => {
      // iOS and Android may show their own menu on a long press.
      if (machine.fired) e.preventDefault()
    },
    [machine],
  )
  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
    onClickCapture,
    onContextMenu,
  }
}
