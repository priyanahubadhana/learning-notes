/** Height the ⋯ list needs (6 rows, 2 lines, the title row), px. */
export const LIST_H = 340
/** Under a box a shorter list is fine: it scrolls inside (shared scroll bar). */
const MIN_UNDER = 220
const GAP = 8

type Box = { left: number; right: number; top: number; bottom: number }

/**
 * Where the ⋯ list goes so it never covers the box: beside it (right, then
 * left), else under it. Returns the anchor the shared menu wants (its right
 * edge and its bottom edge; its top 0 keeps it opening downwards), or null
 * when nothing fits and the menu may use its own place.
 */
export function placeList(
  box: Box,
  width: number,
  view: { width: number; height: number },
): { right: number; bottom: number } | null {
  const top = Math.min(Math.max(box.top, GAP), view.height - GAP - LIST_H)
  if (top < GAP) return null
  if (box.right + GAP + width <= view.width - GAP)
    return { right: box.right + GAP + width, bottom: top - 4 }
  if (box.left - GAP - width >= GAP)
    return { right: box.left - GAP, bottom: top - 4 }
  if (box.bottom + GAP + MIN_UNDER <= view.height - GAP)
    return {
      right: Math.min(
        Math.max(box.left + width, width + GAP),
        view.width - GAP,
      ),
      bottom: box.bottom + GAP - 4,
    }
  return null
}
