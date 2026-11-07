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

const PREF = 'ink.lasso.row'
const isRow = (v: unknown): v is RowAction[] =>
  Array.isArray(v) &&
  v.every((x) => (ROW_ACTIONS as readonly unknown[]).includes(x))

/** The actions in the menu row (in `ROW_ACTIONS` order). */
export const lassoRow = memStore<readonly RowAction[]>(
  readPref(PREF, isRow, [...DEFAULT_ROW]),
)

export function setRowAction(action: RowAction, on: boolean): void {
  const now = new Set(lassoRow.get())
  if (on) now.add(action)
  else now.delete(action)
  const next = ROW_ACTIONS.filter((a) => now.has(a))
  lassoRow.set(next)
  writePref(PREF, next)
}

/** Splits every action into the row and the rest (under More), in order. */
export function splitMenu(
  all: readonly RowAction[],
  row: readonly RowAction[],
): { row: RowAction[]; more: RowAction[] } {
  return {
    row: all.filter((a) => row.includes(a)),
    more: all.filter((a) => !row.includes(a)),
  }
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
