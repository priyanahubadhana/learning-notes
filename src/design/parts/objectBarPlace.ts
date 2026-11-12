import type { Rect } from '../../app/overlay'

export const BAR_GAP = 12
export const BAR_MARGIN = 12
const BTN = 46 // 44 px button + 2 px gap

/**
 * Where the Object bar goes: above the object (12 px gap), below when there is
 * no room above, always inside 12 px of the screen. Never over the object
 * unless neither side fits (then it is clamped, handles stay reachable).
 */
export function placeBar(
  target: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number; side: 'above' | 'below' } {
  const aboveTop = target.top - BAR_GAP - size.height
  const belowTop = target.top + target.height + BAR_GAP
  const fitsAbove = aboveTop >= BAR_MARGIN
  const fitsBelow = belowTop + size.height <= viewport.height - BAR_MARGIN
  const side = fitsAbove || !fitsBelow ? 'above' : 'below'
  const rawTop = side === 'above' ? aboveTop : belowTop
  const maxTop = Math.max(BAR_MARGIN, viewport.height - size.height - BAR_MARGIN)
  const top = Math.min(Math.max(rawTop, BAR_MARGIN), maxTop)
  const centre = target.left + target.width / 2 - size.width / 2
  const maxLeft = Math.max(BAR_MARGIN, viewport.width - size.width - BAR_MARGIN)
  const left = Math.min(Math.max(centre, BAR_MARGIN), maxLeft)
  return { left, top, side }
}

/**
 * How many actions show as buttons; the rest go to the "…" menu. Actions marked
 * `pro` always go to the menu. Never a sideways scroll.
 */
export function splitActions<T extends { pro?: string }>(
  actions: readonly T[],
  availableWidth: number,
  labelWidth = 0,
): { shown: T[]; overflow: T[] } {
  const direct = actions.filter((a) => !a.pro)
  const pro = actions.filter((a) => a.pro)
  const room = Math.floor((availableWidth - 8 - labelWidth) / BTN)
  // If everything fits with no menu, show all; else keep one slot for "…".
  if (!pro.length && direct.length <= room) return { shown: direct, overflow: [] }
  const slots = Math.max(0, room - 1)
  return {
    shown: direct.slice(0, slots),
    overflow: [...direct.slice(slots), ...pro],
  }
}
