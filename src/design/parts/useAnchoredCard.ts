import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { placeBeside, type Side } from '../../app/overlay'

/** Gap between the ▾ and the card, and the least distance to the screen edge. */
export const CARD_GAP = 8
export const CARD_EDGE = 12
export const PHONE_MAX = 640

export interface CardPos {
  left: number
  top: number
  side: Side
  /** Arrow centre from the card's left edge; null = no arrow (side placement). */
  arrowX: number | null
  /** Card width after the `100vw - 24` cap. */
  width: number
}

type RectLike = { left: number; top: number; width: number; height: number }

const rectOf = (a: HTMLElement | RectLike): RectLike =>
  a instanceof Element ? a.getBoundingClientRect() : a

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

/**
 * Pure placement (tested): 8 px below the ▾ with the left edge on it, never
 * within 12 px of the screen edge (the arrow slides instead). If it does not
 * fit below, it goes beside the target (right, left, above) with no arrow.
 */
export function placeCard(
  anchor: RectLike,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  /** Something the card must not cover (the selected picture), or null. */
  avoid: RectLike | null = null,
  /** `above`: a tools row at the bottom of the screen opens its card above it (step 3). */
  prefer?: 'above',
): CardPos {
  const width = Math.min(size.width, viewport.width - 2 * CARD_EDGE)
  const bottom = anchor.top + anchor.height
  const fitsBelow =
    size.height <= viewport.height - bottom - CARD_GAP - CARD_EDGE
  const arrowAt = (left: number) =>
    clamp(anchor.left + anchor.width / 2 - left, 22, Math.max(22, width - 22))
  const hits = (left: number, top: number) =>
    !!avoid &&
    left < avoid.left + avoid.width &&
    left + width > avoid.left &&
    top < avoid.top + avoid.height &&
    top + size.height > avoid.top
  if (prefer === 'above') {
    const room = anchor.top - CARD_GAP - CARD_EDGE
    if (size.height <= room) {
      const left = clamp(
        anchor.left,
        CARD_EDGE,
        Math.max(CARD_EDGE, viewport.width - CARD_EDGE - width),
      )
      return {
        left,
        top: anchor.top - CARD_GAP - size.height,
        side: 'above',
        arrowX: arrowAt(left),
        width,
      }
    }
  }
  const belowLeft = clamp(
    anchor.left,
    CARD_EDGE,
    Math.max(CARD_EDGE, viewport.width - CARD_EDGE - width),
  )
  if (fitsBelow && !hits(belowLeft, bottom + CARD_GAP)) {
    const left = clamp(
      anchor.left,
      CARD_EDGE,
      Math.max(CARD_EDGE, viewport.width - CARD_EDGE - width),
    )
    return {
      left,
      top: bottom + CARD_GAP,
      side: 'below',
      arrowX: arrowAt(left),
      width,
    }
  }
  if (avoid) {
    const top = clamp(
      bottom + CARD_GAP,
      CARD_EDGE,
      Math.max(CARD_EDGE, viewport.height - CARD_EDGE - size.height),
    )
    const gap = CARD_GAP
    const tries: [Side, number, number][] = [
      ['right', avoid.left + avoid.width + gap, top],
      ['left', avoid.left - gap - width, top],
    ]
    for (const [side, left, t] of tries)
      if (
        left >= CARD_EDGE &&
        left + width <= viewport.width - CARD_EDGE &&
        !hits(left, t)
      )
        return { left, top: t, side, arrowX: null, width }
  }
  const p = placeBeside(
    anchor,
    { width, height: size.height },
    viewport,
    CARD_EDGE,
  )
  return {
    left: p.left,
    top: p.top,
    side: p.side,
    arrowX: p.side === 'below' || p.side === 'above' ? arrowAt(p.left) : null,
    width,
  }
}

const PHONE_QUERY = `(max-width: ${PHONE_MAX}px)`
const subscribePhone = (cb: () => void) => {
  const mq = globalThis.matchMedia?.(PHONE_QUERY)
  mq?.addEventListener('change', cb)
  return () => mq?.removeEventListener('change', cb)
}
const phoneNow = () => globalThis.matchMedia?.(PHONE_QUERY).matches ?? false

/** True on a phone-width screen (≤ 640): cards become bottom sheets. */
export const usePhone = (): boolean =>
  useSyncExternalStore(subscribePhone, phoneNow, () => false)

/**
 * Measures the card and the anchor and returns where to put it. Re-measures
 * when the card grows or the viewport changes (ResizeObserver, no raw window
 * listeners).
 */
export function useAnchoredCard(opts: {
  anchor: HTMLElement | RectLike | null
  card: HTMLElement | null
  widthPx: number
  active: boolean
  /** Rect of something the card must keep clear of, read at each placement. */
  avoid?: () => RectLike | null
  prefer?: 'above'
}): CardPos | null {
  const { anchor, card, widthPx, active, avoid, prefer } = opts
  const [pos, setPos] = useState<CardPos | null>(null)
  useLayoutEffect(() => {
    if (!active || !anchor || !card) {
      return
    }
    const run = () => {
      const root = document.documentElement
      const next = placeCard(
        rectOf(anchor),
        { width: widthPx, height: card.offsetHeight },
        { width: root.clientWidth, height: window.innerHeight },
        avoid?.() ?? null,
        prefer,
      )
      setPos((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.side === next.side &&
        prev.arrowX === next.arrowX &&
        prev.width === next.width
          ? prev
          : next,
      )
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(card)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [anchor, card, widthPx, active, avoid, prefer])
  return active && anchor && card ? pos : null
}
