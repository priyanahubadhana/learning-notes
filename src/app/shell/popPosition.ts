const MARGIN = 8

/** Where the menu goes: below the button, flipped above when it does not fit, clamped to the view. */
export function popPosition(
  a: { left: number; top: number; width: number; height: number },
  size: { width: number; height: number },
  view: { width: number; height: number; top?: number },
): { left: number; top: number; flipped: boolean } {
  const top0 = view.top ?? 0
  const below = a.top + a.height + 4
  const fitsBelow = below + size.height <= top0 + view.height - MARGIN
  const above = a.top - 4 - size.height
  const flipped = !fitsBelow && above >= top0 + MARGIN
  const top = flipped
    ? above
    : Math.max(
        top0 + MARGIN,
        Math.min(below, top0 + view.height - MARGIN - size.height),
      )
  const left = Math.max(
    MARGIN,
    Math.min(a.left, view.width - MARGIN - size.width),
  )
  return { left, top, flipped }
}
