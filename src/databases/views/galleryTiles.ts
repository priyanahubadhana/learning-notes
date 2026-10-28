import type { DbColumn, JsonObject } from '../../core/types'
import { parseImageRef } from '../../images/imageRef'

/** Values shown on a tile unless the user picks others. */
const DEFAULT_VALUES = 3

/** Only web addresses are used as pictures (never script or file links). */
export const imageUrl = (text: string): string | null =>
  /^https?:\/\//i.test(text.trim()) || parseImageRef(text) ? text.trim() : null

/** The columns whose values show on a tile: the saved ones, else the first few. */
export function tileColumns(
  config: JsonObject,
  columns: readonly DbColumn[],
  imageColumnId: string | undefined,
): DbColumn[] {
  const others = columns.filter((c) => c.id !== imageColumnId)
  if (!Array.isArray(config.cardColumns)) {
    return others.slice(0, DEFAULT_VALUES)
  }
  const picked = new Set(config.cardColumns)
  return others.filter((c) => picked.has(c.id))
}

/** Where a tile goes: right before or right after another tile's row. */
export type TilePlace = { before: string } | { after: string }

/**
 * A tile dropped on another tile: before it if it landed on its first half
 * (the left, in a left-to-right language), else after it. Dropping a tile on
 * itself changes nothing.
 */
export function dropPlace(
  rowId: string,
  targetId: string,
  after: boolean,
): TilePlace | null {
  if (rowId === targetId) return null
  return after ? { after: targetId } : { before: targetId }
}

/**
 * The place for moving a tile one step (`delta` -1 = earlier, 1 = later) in
 * the order the tiles are shown; null at either end.
 */
export function stepPlace(
  ids: readonly string[],
  rowId: string,
  delta: -1 | 1,
): TilePlace | null {
  const at = ids.indexOf(rowId)
  const next = ids[at + delta]
  if (at < 0 || next === undefined) return null
  return delta < 0 ? { before: next } : { after: next }
}
