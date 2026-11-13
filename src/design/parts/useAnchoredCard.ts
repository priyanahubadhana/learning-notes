import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { placeBeside, type Side } from '../../app/overlay'

/** Gap between the ▾ and the card, and the least distance to the screen edge. */
export const CARD_GAP = 8
export const CARD_EDGE = 12
export const PHONE_MAX = 640
/** The least height a card is shortened to (a title and a few rows). */
const MIN_SHORT = 160

export interface CardPos {
  left: number
  top: number
  side: Side
  /** Arrow centre from the card's left edge; null = no arrow (side placement). */
  arrowX: number | null
  /** Card width after the `100vw - 24` cap. */
  width: number
  /** Set when the card must be shorter than itself to keep clear of something; the rest scrolls. */
  maxHeight?: number
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

/**
 * Where a card goes around a box it must never cover (TB-42, M1): right of
 * the box, else left, else under it, else above it. The card keeps 12 px
 * inside the screen. No arrow (it hangs beside the box, not from a chip).
 * Null when nothing fits: the caller falls back to the usual placement.
 */
export function placeAround(
  box: RectLike,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  /** Highest y the card may start at (just under a bar it must not cover); 0 = none. */
  clearTop = 0,
): CardPos | null {
  const width = Math.min(size.width, viewport.width - 2 * CARD_EDGE)
  const maxLeft = Math.max(CARD_EDGE, viewport.width - CARD_EDGE - width)
  const maxTop = Math.max(CARD_EDGE, viewport.height - CARD_EDGE - size.height)
  const fitsY = size.height <= viewport.height - 2 * CARD_EDGE
  const right = box.left + box.width + CARD_GAP
  const left = box.left - CARD_GAP - width
  const below = box.top + box.height + CARD_GAP
  const above = box.top - CARD_GAP - size.height
  const sideTop = clamp(box.top, CARD_EDGE, maxTop)
  const flatLeft = clamp(box.left, CARD_EDGE, maxLeft)
  if (fitsY && right + width <= viewport.width - CARD_EDGE)
    return { left: right, top: sideTop, side: 'right', arrowX: null, width }
  if (fitsY && left >= CARD_EDGE)
    return { left, top: sideTop, side: 'left', arrowX: null, width }
  if (below + size.height <= viewport.height - CARD_EDGE)
    return { left: flatLeft, top: below, side: 'below', arrowX: null, width }
  const floor = Math.max(CARD_EDGE, clearTop)
  if (above >= floor)
    return { left: flatLeft, top: above, side: 'above', arrowX: null, width }
  // Too tall to sit above under the bar: shorten it to the room there is.
  const room = box.top - CARD_GAP - floor
  if (clearTop > 0 && room >= MIN_SHORT)
    return {
      left: flatLeft,
      top: floor,
      side: 'above',
      arrowX: null,
      width,
      maxHeight: room,
    }
  return null
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
  /** A box to hang around (right, left, under, above); wins over `avoid`. */
  around?: () => RectLike | null
  /** With `around`: the card never starts above this y (the bottom of the bar + 8). */
  clearTop?: () => number
}): CardPos | null {
  const { anchor, card, widthPx, active, avoid, around, clearTop } = opts
  const [pos, setPos] = useState<CardPos | null>(null)
  useLayoutEffect(() => {
    if (!active || !anchor || !card) {
      return
    }
    const run = () => {
      const root = document.documentElement
      const size = { width: widthPx, height: card.offsetHeight }
      const view = { width: root.clientWidth, height: window.innerHeight }
      const box = around?.() ?? null
      const next =
        (box && placeAround(box, size, view, clearTop?.() ?? 0)) ||
        placeCard(rectOf(anchor), size, view, box ?? avoid?.() ?? null)
      setPos((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.side === next.side &&
        prev.arrowX === next.arrowX &&
        prev.width === next.width &&
        prev.maxHeight === next.maxHeight
          ? prev
          : next,
      )
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(card)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [anchor, card, widthPx, active, avoid, around, clearTop])
  return active && anchor && card ? pos : null
}
