import type { DbColumn, JsonObject } from '../../core/types'

/** Values shown on a tile unless the user picks others. */
const DEFAULT_VALUES = 3

/** Only web addresses are used as pictures (never script or file links). */
export const imageUrl = (text: string): string | null =>
  /^https?:\/\//i.test(text.trim()) ? text.trim() : null

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
