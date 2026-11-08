import { memStore } from '../app/tools/store'
import { readPref, writePref } from '../app/uiPrefs'

/**
 * The Lasso's menu (owner-approved design, 7 Nov): a short row of icons and
 * the rest under "⋯ More". Which actions sit in the row is a choice in the
 * Lasso card, kept on this device. Pure lists; the surface draws them.
 */

export const ROW_ACTIONS = [
  'copy',
  'cut',
  'duplicate',
  'convert',
  'colour',
  'delete',
  'thickness',
  'makeCard',
  'summary',
  'label',
] as const
export type RowAction = (typeof ROW_ACTIONS)[number]

/** The owner's default row. */
export const DEFAULT_ROW: readonly RowAction[] = [
  'copy',
  'cut',
  'duplicate',
  'convert',
  'colour',
]

/** True while the arrange sheet (LassoMenuSheet) is open. */
export const lassoSheetOpen = memStore(false)

const PREF = 'ink.lasso.row'
const isRowAction = (x: unknown): x is RowAction =>
  (ROW_ACTIONS as readonly unknown[]).includes(x)
const isRow = (v: unknown): v is RowAction[] =>
  Array.isArray(v) && v.every(isRowAction)

/**
 * The actions in the menu row, in the order the person arranged them
 * (polish 2, item 6: Edit toolbar sheet; before that the order was fixed).
 */
export const lassoRow = memStore<readonly RowAction[]>(
  readPref(PREF, isRow, [...DEFAULT_ROW]),
)

/** Saves the row: unknown actions and repeats drop out, the order stays. */
export function setRow(list: readonly string[]): void {
  const next = [...new Set(list.filter(isRowAction))]
  lassoRow.set(next)
  writePref(PREF, next)
}

export function setRowAction(action: RowAction, on: boolean): void {
  const rest = lassoRow.get().filter((a) => a !== action)
  setRow(on ? [...rest, action] : rest)
}

/**
 * Splits every action into the row (in the person's order) and the rest
 * (under More, in the standard order).
 */
export function splitMenu(
  all: readonly RowAction[],
  row: readonly RowAction[],
): { row: RowAction[]; more: RowAction[] } {
  return {
    row: row.filter((a) => all.includes(a)),
    more: all.filter((a) => !row.includes(a)),
  }
}

/**
 * Puts a menu's items in the Lasso row's order: the row's actions first, the
 * rest after them in their own order. The text and picture menu uses this,
 * so every selection menu follows one order.
 */
export function orderByRow<T extends { id: string }>(
  items: readonly T[],
  row: readonly string[],
): T[] {
  const at = (id: string) => {
    const i = row.indexOf(id)
    return i < 0 ? row.length : i
  }
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => at(a.item.id) - at(b.item.id) || a.index - b.index)
    .map((x) => x.item)
}

/**
 * Which blocks a loop picks (owner): a line counts when most of it is
 * inside. `inside` says whether a point is inside the loop; five points
 * along the block's middle line are tried.
 */
export function mostlyInside(
  b: { x: number; y: number; w: number; h: number },
  inside: (p: { x: number; y: number }) => boolean,
): boolean {
  let n = 0
  for (const k of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    if (inside({ x: b.x + b.w * k, y: b.y + b.h / 2 })) n++
  }
  return n >= 3
}
