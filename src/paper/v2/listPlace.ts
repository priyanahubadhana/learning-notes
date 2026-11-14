/** Height the ⋯ list needs (6 rows, 2 lines, the title row), px. */
export const LIST_H = 340
/** Under a box a shorter list is fine: it scrolls inside (shared scroll bar). */
const MIN_UNDER = 220
const GAP = 8

type Box = { left: number; right: number; top: number; bottom: number }

/**
 * Where the ⋯ list goes so it never covers the box: beside it (right, then
 * left), else under it, else over it (a box low on a phone). Returns the
 * anchor the shared menu wants: its right edge and its bottom edge (its top 0
 * keeps it opening downwards), or with `above` the line the list's bottom sits
 * on, opening upwards. Null when nothing fits and the menu may use its own
 * place. `upLine`: the shared menu opens upwards only from below this line.
 */
export function placeList(
  box: Box,
  width: number,
  view: { width: number; height: number },
  upLine = view.height / 2,
): { right: number; bottom: number; above?: number } | null {
  const right = Math.min(
    Math.max(box.left + width, width + GAP),
    view.width - GAP,
  )
  const top = Math.min(Math.max(box.top, GAP), view.height - GAP - LIST_H)
  if (top < GAP) return null
  if (box.right + GAP + width <= view.width - GAP)
    return { right: box.right + GAP + width, bottom: top - 4 }
  if (box.left - GAP - width >= GAP)
    return { right: box.left - GAP, bottom: top - 4 }
  if (box.bottom + GAP + MIN_UNDER <= view.height - GAP)
    return { right, bottom: box.bottom + GAP - 4 }
  if (box.top - GAP - MIN_UNDER >= GAP && box.top - GAP > upLine)
    return { right, bottom: 0, above: box.top - GAP }
  return null
}

/** Height of the bottom bar (phones), so the list does not run under it. */
export function bottomBar(): number {
  const at = document.elementFromPoint(innerWidth / 2, innerHeight - 2)
  const top = at?.closest('nav')?.getBoundingClientRect().top
  return top && top < innerHeight ? innerHeight - top : 0
}
