import type { Block, BlockTag } from '../core/types'
import { inlineTagIds } from '../editor/mapping'

/**
 * The `blockTags` helper list: one row per tag written in a block ("#"),
 * so "blocks with tag X" is an index lookup (`tagId`). Rows are rebuilt
 * from the block on every save (index middleware) and by the backfill;
 * they are never synced. Page tags live on the page (`Page.tagIds`).
 */

const rowPrefix = (blockId: string) => `${blockId}|`

/** First and last possible row id of a block's tags (a key range). */
export function blockTagRowRange(blockId: string): [string, string] {
  return [rowPrefix(blockId), `${rowPrefix(blockId)}￿`]
}

/** The tag rows of a block; none while it is in the Trash (or erased). */
export function blockTagRows(block: Block): BlockTag[] {
  if (block.deletedAt !== null || block.purgedAt !== undefined) return []
  return inlineTagIds(block).map((tagId) => ({
    id: `${rowPrefix(block.id)}${tagId}`,
    blockId: block.id,
    pageId: block.pageId,
    tagId,
  }))
}
