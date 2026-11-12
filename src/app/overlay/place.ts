export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export type Side = 'right' | 'left' | 'below' | 'above'

export interface Placement {
  left: number
  top: number
  side: Side
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

/**
 * Puts a card beside its target: right, else left, else below, else above.
 * Never over the target when any side fits; always clamped inside the viewport.
 */
export function placeBeside(
  target: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 8,
): Placement {
  const { width: w, height: h } = size
  const maxLeft = Math.max(margin, viewport.width - w - margin)
  const maxTop = Math.max(margin, viewport.height - h - margin)
  const tRight = target.left + target.width
  const tBottom = target.top + target.height

  const room: Record<Side, number> = {
    right: viewport.width - margin - tRight - margin,
    left: target.left - margin - margin,
    below: viewport.height - margin - tBottom - margin,
    above: target.top - margin - margin,
  }
  const need = (s: Side) => (s === 'right' || s === 'left' ? w : h)

  const order: Side[] = ['right', 'left', 'below', 'above']
  let side = order.find((s) => room[s] >= need(s))
  if (!side)
    side = order.reduce((a, b) =>
      room[b] - need(b) > room[a] - need(a) ? b : a,
    )

  let left: number
  let top: number
  if (side === 'right' || side === 'left') {
    left = side === 'right' ? tRight + margin : target.left - margin - w
    top = target.top
  } else {
    top = side === 'below' ? tBottom + margin : target.top - margin - h
    left = target.left
  }
  return {
    left: clamp(left, margin, maxLeft),
    top: clamp(top, margin, maxTop),
    side,
  }
}
