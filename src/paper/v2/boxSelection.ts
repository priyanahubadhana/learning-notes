import type { SelectionStore } from '../../app/selection/store'

/** The owner name the paper boxes use in the selection store. */
export const BOX_OWNER = 'paper.box'

/** Select these boxes (replaces any text, ink, picture or cell selection). */
export function selectBoxes(
  store: SelectionStore,
  ids: readonly string[],
): void {
  if (ids.length === 0) return store.clear(BOX_OWNER)
  store.select({ kind: 'box', owner: BOX_OWNER, boxIds: [...ids] })
}

/** The boxes were deselected: only a box selection is cleared. */
export function clearBoxes(store: SelectionStore): void {
  store.clear(BOX_OWNER)
}

/** TB-01: a box that is not selected yet is selected by the first tap. */
export function tapAction(box: { picked: boolean }): 'select' | 'caret' {
  return box.picked ? 'caret' : 'select'
}

/** The keyboard rule: the Pencil writes by hand, so it never opens the keyboard. */
export function inputModeFor(pointerType: string): 'none' | 'text' {
  return pointerType === 'pen' ? 'none' : 'text'
}

/** A tap: it barely moved and was short (same limits as tapSelect.ts). */
export function isTap(movedPx: number, heldMs: number): boolean {
  return movedPx <= 12 && heldMs <= 300
}

/**
 * TB-06: a tap beside a box makes the new box in its own row under that box,
 * never beside it. `y` and the spans are in the same unit (mm); the answer is
 * the lowest bottom edge of the boxes the tap's height cuts through, plus the
 * gap, or `y` itself when no box is level with the tap.
 */
export function rowUnder(
  y: number,
  spans: readonly { top: number; bottom: number }[],
  gap: number,
): number {
  let at = y
  for (const s of spans)
    if (y >= s.top && y <= s.bottom) at = Math.max(at, s.bottom + gap)
  return at
}
