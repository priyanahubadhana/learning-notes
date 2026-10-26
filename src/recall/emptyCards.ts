import type { LearningNotesDB } from '../core/db'
import { listBlocks } from '../core/blockService'
import { byOrder, ordersBetween } from '../core/order'
import type { Block } from '../core/types'
import { CARD_BLOCK_TYPE, hasQuestion } from './cardService'

/**
 * Empty-card cleanup (Search › Card status › Empty). An empty Card has no
 * question, so it is never reviewed; its answer lines may still hold
 * notes. Removing it deletes only the Card block: its answer lines move up
 * to where the card was, as normal notes. One transaction; undoable.
 */

/** What a removal changed, for Undo and for reloading open pages. */
export interface RemovedCards {
  /** Number of Card blocks removed. */
  count: number
  /** Pages whose blocks changed. */
  pageIds: string[]
  /** The changed blocks as they were before (written back by Undo). */
  before: Block[]
}

/**
 * Removes the empty Cards among `blockIds` (others are skipped: a card
 * that got a question meanwhile stays), keeping their answer lines.
 */
export async function removeEmptyCards(
  db: LearningNotesDB,
  blockIds: readonly string[],
): Promise<RemovedCards> {
  return db.transaction('rw', db.blocks, async () => {
    const now = Date.now()
    const found = await db.blocks.bulkGet([...new Set(blockIds)])
    const targets = found.filter(
      (b): b is Block =>
        !!b &&
        b.deletedAt === null &&
        b.type === CARD_BLOCK_TYPE &&
        !hasQuestion(b),
    )
    const before = new Map<string, Block>()
    const changed = new Map<string, Block>()
    const pageIds = [...new Set(targets.map((b) => b.pageId))]

    for (const pageId of pageIds) {
      // Worked on in memory, so nested empty cards see earlier moves.
      const blocks = new Map(
        (await listBlocks(db, pageId)).map((b) => [b.id, b]),
      )
      const update = (block: Block, fields: Partial<Block>) => {
        if (!before.has(block.id)) before.set(block.id, block)
        const next = { ...block, ...fields, updatedAt: now }
        blocks.set(block.id, next)
        changed.set(block.id, next)
      }
      const childrenOf = (parentId: string | null) =>
        [...blocks.values()]
          .filter((b) => b.parentId === parentId && b.deletedAt === null)
          .sort(byOrder)

      for (const target of targets.filter((b) => b.pageId === pageId)) {
        const card = blocks.get(target.id)
        if (!card) continue
        const siblings = childrenOf(card.parentId)
        const next = siblings[siblings.findIndex((b) => b.id === card.id) + 1]
        const answer = childrenOf(card.id)
        const keys = ordersBetween(
          card.order,
          next?.order ?? null,
          answer.length,
        )
        answer.forEach((child, i) =>
          update(child, { parentId: card.parentId, order: keys[i] }),
        )
        update(card, { deletedAt: now })
      }
    }
    await db.blocks.bulkPut([...changed.values()])
    return { count: targets.length, pageIds, before: [...before.values()] }
  })
}

/** Undo: puts the removed cards and their answer lines back. */
export async function restoreEmptyCards(
  db: LearningNotesDB,
  removed: RemovedCards,
): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.blocks, async () => {
    await db.blocks.bulkPut(
      removed.before.map((b) => ({ ...b, updatedAt: now })),
    )
  })
}
