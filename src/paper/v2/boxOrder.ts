import type { LearningNotesDB } from '../../core/db'
import type { GridRow } from '../../core/types'
import { MAIN_BOX } from '../boxes'
import { updateGrid } from '../boxService'
import { placesOf, readingIds } from '../grid'
import type { GridInfo } from '../layoutPlan'

export type Step = 'up' | 'down'

/**
 * The box a Move up / Move down would swap with: the next one in reading order
 * (row, column, stack). The page's own text box never takes part: it stays
 * first, so there is no neighbour next to it.
 */
export function neighbourOf(
  rows: readonly GridRow[],
  id: string,
  step: Step,
): string | null {
  if (id === MAIN_BOX) return null
  const ids = readingIds(rows)
  const at = ids.indexOf(id)
  if (at < 0) return null
  const other = ids[at + (step === 'up' ? -1 : 1)]
  return other && other !== MAIN_BOX ? other : null
}

/** The rows with two boxes in each other's cells (cells keep their sizes). */
export function swapBoxes(
  rows: readonly GridRow[],
  a: string,
  b: string,
): GridRow[] {
  const swap = (id: string) => (id === a ? b : id === b ? a : id)
  return rows.map((r) => ({
    ...r,
    cols: r.cols.map((c) => ({ ...c, boxIds: c.boxIds.map(swap) })),
  }))
}

/**
 * TB-19: ⋯ › Move up / Move down. `info` is the grid as drawn now. One write
 * (rows and the places they give the boxes), so one Undo step. Returns false
 * when there is nothing to swap with.
 */
export async function moveStep(
  db: LearningNotesDB,
  pageId: string,
  info: GridInfo,
  id: string,
  step: Step,
): Promise<boolean> {
  const other = neighbourOf(info.rows, id, step)
  if (!other) return false
  const rows = swapBoxes(info.rows, id, other)
  await updateGrid(db, pageId, rows, placesOf(rows, info.heights, info.geo))
  return true
}
