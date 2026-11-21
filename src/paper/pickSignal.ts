/**
 * "Select this box when it appears" (C20): Duplicate box makes a copy that
 * must come up selected (frame and dots, no caret). The page draws the copy
 * a moment after it is stored, so the wish waits here until the box is there.
 */
let wanted: string | null = null

export const pickWhenShown = (id: string | null | undefined): void => {
  wanted = id || null // a failed copy clears an older wish
}

/** The wished id if it is among `ids` (and then forgets it). */
export function takePick(ids: readonly string[]): string | null {
  if (!wanted || !ids.includes(wanted)) return null
  const id = wanted
  wanted = null
  return id
}
