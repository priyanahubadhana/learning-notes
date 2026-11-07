/**
 * Pure helpers of the shared "edit a list" sheet (R7-11): the bar, a pill's
 * options and any other customisable list use the same moves.
 */

/** Moves `id` so that it sits at index `to` of the list as it is after the move. */
export function moveTo<T>(list: readonly T[], id: T, to: number): T[] {
  const from = list.indexOf(id)
  if (from < 0) return [...list]
  const next = [...list]
  next.splice(from, 1)
  next.splice(Math.min(next.length, Math.max(0, to)), 0, id)
  return next
}

/**
 * The drop slot for a dragged row: `drop` counts the rows of the list as it
 * is now (0 = before the first, length = after the last). Dropping a row on
 * its own slot changes nothing; moving down by one slot skips the row itself.
 */
export function moveToSlot<T>(list: readonly T[], id: T, drop: number): T[] {
  const from = list.indexOf(id)
  if (from < 0) return [...list]
  return moveTo(list, id, drop > from ? drop - 1 : drop)
}

/** Adds `id` at `index` (a tool that is already there is moved instead). */
export function insertAt<T>(list: readonly T[], id: T, index: number): T[] {
  if (list.includes(id)) return moveToSlot(list, id, index)
  const next = [...list]
  next.splice(Math.min(next.length, Math.max(0, index)), 0, id)
  return next
}

export const removeId = <T>(list: readonly T[], id: T): T[] =>
  list.filter((x) => x !== id)

/** Which slot a pointer at height `y` is in, given the rows' top and bottom. */
export function slotAt(
  rows: readonly { top: number; bottom: number }[],
  y: number,
): number {
  let slot = 0
  for (const r of rows) {
    if (y > (r.top + r.bottom) / 2) slot++
  }
  return slot
}

/** True if `value` is inside the box (with a little slack for a thumb). */
export function inBox(
  box: { left: number; right: number; top: number; bottom: number },
  x: number,
  y: number,
  slack = 12,
): boolean {
  return (
    x >= box.left - slack &&
    x <= box.right + slack &&
    y >= box.top - slack &&
    y <= box.bottom + slack
  )
}
