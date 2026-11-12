import { useEffect, useRef } from 'react'
import { getGestureRouter, type Claimant } from '../../app/input/gestureRouter'
import { overlay } from '../../app/overlay'

/** Marks a row that opens the Context menu strip: `data-hold="kind:id"`. */
export const HOLD_ATTR = 'data-hold'

export interface HoldInfo {
  kind: string
  id: string
  /** The row that was held, for the strip's position and for focus return. */
  el: HTMLElement
}

/** A native context menu this soon after a hold is the same press (Android fires both). */
const SAME_PRESS_MS = 300
/** The click after a hold is not a tap: set when a hold fires, cleared by the next press. */
let swallowClick = false
let firedAt = 0
let clearTimer: ReturnType<typeof setTimeout> | undefined

/** True just after a hold fired: the click that follows is not a tap. */
export const holdJustFired = (): boolean => swallowClick

/** The holdable element above a target, or null. */
export function holdInfo(target: EventTarget | null): HoldInfo | null {
  const el =
    target instanceof Element
      ? target.closest<HTMLElement>(`[${HOLD_ATTR}]`)
      : null
  const raw = el?.getAttribute(HOLD_ATTR)
  if (!el || !raw) return null
  const at = raw.indexOf(':')
  if (at <= 0) return null
  return { kind: raw.slice(0, at), id: raw.slice(at + 1), el }
}

/**
 * A claimant for the gesture router (src/app/input): a finger or a mouse held
 * 500 ms on a `data-hold` row. The Pencil never claims (it draws and taps).
 * The router cancels it if the pointer moves more than its slop, and ends it
 * if the lift or the app switch is lost.
 */
export function makeHoldClaimant(
  onHold: (info: HoldInfo) => void,
  id = 'rowHold',
): Claimant {
  return {
    id,
    claim(s) {
      if (s.pointerType === 'pen') return null
      swallowClick = false
      // A menu, card or sheet is open: its first outside tap only closes it.
      if (overlay.count() > 0) return null
      return holdInfo(s.target) ? 'longpress' : null
    },
    onStart(g) {
      const info = holdInfo(g.target)
      if (!info) return
      swallowClick = true
      firedAt = Date.now()
      onHold(info)
    },
    onEnd() {
      // The click follows the lift at once; after that a tap is a tap again.
      if (swallowClick) {
        clearTimeout(clearTimer)
        clearTimer = setTimeout(() => {
          swallowClick = false
        }, 400)
      }
    },
  }
}

/** React: while mounted, a hold on any `data-hold` row calls `onHold`. */
export function useRowHold(onHold: (info: HoldInfo) => void): void {
  const ref = useRef(onHold)
  useEffect(() => {
    ref.current = onHold
  })
  useEffect(
    () => getGestureRouter().register(makeHoldClaimant((i) => ref.current(i))),
    [],
  )
}

/** Right-click on a row: the same strip (a hold that just fired is not repeated). */
export function rightClickInfo(
  target: EventTarget | null,
  now = Date.now(),
): HoldInfo | null {
  if (now - firedAt < SAME_PRESS_MS) return null
  return holdInfo(target)
}
