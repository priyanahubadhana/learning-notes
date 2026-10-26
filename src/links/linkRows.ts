import type { Block, LinkRef } from '../core/types'
import { linkTargets } from '../editor/mapping'

/**
 * The `links` helper list: one row per link written in a block, so "Linked
 * from" is an index lookup (`toPageId`) instead of a scan of every note.
 * Rows are rebuilt from the block on every save (index middleware) and by
 * the backfill; they are never synced.
 */

/** Row id prefix of a block's links (`<blockId>|<index>`). */
const rowPrefix = (blockId: string) => `${blockId}|`

/** First and last possible row id of a block's links (a key range). */
export function linkRowRange(blockId: string): [string, string] {
  return [rowPrefix(blockId), `${rowPrefix(blockId)}￿`]
}

/**
 * The link rows of a block: one per different target, none while the block
 * is in the Trash (or erased), so deleted notes never show as "Linked from".
 */
export function linkRows(block: Block): LinkRef[] {
  if (block.deletedAt !== null || block.purgedAt !== undefined) return []
  const seen = new Set<string>()
  const rows: LinkRef[] = []
  for (const target of linkTargets(block)) {
    const key = `${target.pageId}|${target.blockId}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      id: `${rowPrefix(block.id)}${rows.length}`,
      fromBlockId: block.id,
      fromPageId: block.pageId,
      toPageId: target.pageId,
      ...(target.blockId && { toBlockId: target.blockId }),
    })
  }
  return rows
}
