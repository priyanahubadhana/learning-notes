import type { LearningNotesDB } from './db'
import { EditLockedError, editLockSource } from './editLock'
import { createId } from './ids'
import { orderAtIndex } from './order'
import { getLive, newRecordFields } from './records'
import type { Block, JsonObject } from './types'
import { listBlocks } from './blockService'

/** A block to add: its type and content, and any blocks nested inside it. */
export interface BlockInput {
  type: string
  content: JsonObject
  children?: BlockInput[]
}

export interface AddBlocksOptions {
  /** Under this block (null = top level). */
  parentId?: string | null
  /** `Block.source` for every block added (e.g. `ai`). */
  source?: string
  /** `Block.batchId` for every block added (one AI result). */
  batchId?: string
  /** Position among the siblings; omit to add at the end. */
  index?: number
}

/**
 * Adds many blocks (with nesting) to a page in one transaction. Siblings get
 * fresh order keys after the existing ones. Returns the new records, parents
 * before children.
 */
export async function addBlocks(
  db: LearningNotesDB,
  pageId: string,
  inputs: readonly BlockInput[],
  options: AddBlocksOptions = {},
): Promise<Block[]> {
  const parentId = options.parentId ?? null
  return db.transaction('rw', db.pages, db.notebooks, db.blocks, async () => {
    const page = await getLive(db.pages, pageId)
    if (editLockSource(page, await db.notebooks.get(page.notebookId))) {
      throw new EditLockedError()
    }
    const existing = (await listBlocks(db, pageId)).filter(
      (b) => b.parentId === parentId,
    )
    const made: Block[] = []
    const build = (
      list: readonly BlockInput[],
      parent: string | null,
      startAt: number,
      siblingOrders: string[],
    ) => {
      // Fresh keys one after the other keep every sibling in order.
      const orders = [...siblingOrders]
      list.forEach((input, i) => {
        const order = orderAtIndex(orders, startAt + i)
        orders.splice(startAt + i, 0, order)
        const block: Block = {
          ...newRecordFields(),
          id: createId(),
          pageId,
          parentId: parent,
          type: input.type,
          content: input.content,
          order,
          ...(options.source ? { source: options.source } : {}),
          ...(options.batchId ? { batchId: options.batchId } : {}),
        }
        made.push(block)
        if (input.children?.length) build(input.children, block.id, 0, [])
      })
    }
    build(
      inputs,
      parentId,
      options.index ?? existing.length,
      existing.map((b) => b.order),
    )
    await db.blocks.bulkAdd(made)
    return made
  })
}
