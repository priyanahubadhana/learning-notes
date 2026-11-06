import Dexie from 'dexie'
import type { LearningNotesDB } from './db'
import { createId } from './ids'
import { byOrder, orderAtIndex } from './order'
import {
  descendantIds,
  getLive,
  isLive,
  newRecordFields,
  softDeleteMany,
} from './records'
import { syncTasksFromBlocks } from './taskService'
import type { Block, JsonObject, OrderKey } from './types'

/**
 * Block operations. Each block is its own record; blocks can nest under
 * other blocks on the same page (parentId). The editor bridge (step 5) will
 * translate between the editor and these functions.
 */

/** Input for creating a block. */
export interface NewBlockInput {
  pageId: string
  type: string
  content?: JsonObject
  /** Parent block for nesting; omit or null for a top-level block. */
  parentId?: string | null
  /** Position among siblings; omit to add at the end. */
  index?: number
}

/**
 * Lists all live blocks on a page (every depth) sorted by order.
 * Use parentId to rebuild the nesting.
 */
export async function listBlocks(
  db: LearningNotesDB,
  pageId: string,
): Promise<Block[]> {
  const all = await db.blocks.where('pageId').equals(pageId).toArray()
  return all.filter(isLive).sort(byOrder)
}

/** A page's blocks in reading order (each block before its children). */
export function inReadingOrder(blocks: Block[]): Block[] {
  const childrenOf = new Map<string | null, Block[]>()
  for (const block of blocks) {
    const list = childrenOf.get(block.parentId) ?? []
    list.push(block)
    childrenOf.set(block.parentId, list)
  }
  const result: Block[] = []
  const walk = (parentId: string | null) => {
    for (const block of childrenOf.get(parentId) ?? []) {
      result.push(block)
      walk(block.id)
    }
  }
  walk(null)
  return result
}

/** Checks that a parent block exists on the same page (null = top level). */
async function assertValidParent(
  db: LearningNotesDB,
  pageId: string,
  parentId: string | null,
): Promise<void> {
  if (parentId === null) return
  const parent = await getLive(db.blocks, parentId)
  if (parent.pageId !== pageId) {
    throw new Error('Parent block must be on the same page')
  }
}

/** Creates a block (at the end of its siblings unless `index` is given). */
export async function createBlock(
  db: LearningNotesDB,
  input: NewBlockInput,
): Promise<Block> {
  const { pageId, type, content = {}, parentId = null } = input
  return db.transaction('rw', db.pages, db.blocks, async () => {
    await getLive(db.pages, pageId)
    await assertValidParent(db, pageId, parentId)
    const siblings = (await listBlocks(db, pageId)).filter(
      (b) => b.parentId === parentId,
    )
    const block: Block = {
      ...newRecordFields(),
      pageId,
      parentId,
      type,
      content,
      order: orderAtIndex(
        siblings.map((b) => b.order),
        input.index ?? siblings.length,
      ),
    }
    await db.blocks.add(block)
    return block
  })
}

/** Changes a block's type and/or content. */
export async function updateBlock(
  db: LearningNotesDB,
  id: string,
  changes: { type?: string; content?: JsonObject },
): Promise<void> {
  await db.transaction('rw', db.blocks, async () => {
    await getLive(db.blocks, id)
    await db.blocks.update(id, { ...changes, updatedAt: Date.now() })
  })
}

/**
 * Moves a block under `newParentId` (null = top level) at `toIndex` among its
 * new siblings, on the same page. A block cannot be moved inside itself.
 */
export async function moveBlock(
  db: LearningNotesDB,
  id: string,
  newParentId: string | null,
  toIndex: number,
): Promise<void> {
  await db.transaction('rw', db.blocks, async () => {
    const block = await getLive(db.blocks, id)
    await assertValidParent(db, block.pageId, newParentId)

    const blocks = await listBlocks(db, block.pageId)
    if (
      newParentId !== null &&
      (newParentId === id || descendantIds(blocks, id).includes(newParentId))
    ) {
      throw new Error('A block cannot be moved inside itself')
    }

    const siblings = blocks.filter(
      (b) => b.parentId === newParentId && b.id !== id,
    )
    const order = orderAtIndex(
      siblings.map((b) => b.order),
      toIndex,
    )
    await db.blocks.update(id, {
      parentId: newParentId,
      order,
      updatedAt: Date.now(),
    })
  })
}

/** A block as it should be saved (e.g. from the editor). */
export interface BlockUpsert {
  id: string
  parentId: string | null
  type: string
  content: JsonObject
  order: OrderKey
}

/** A batch of block changes for one page. */
export interface BlockChanges {
  /** Blocks to create or update. */
  upserts: BlockUpsert[]
  /** Ids of blocks to soft-delete (exactly these; no cascade). */
  deletes: string[]
}

/**
 * Applies a batch of changes to a page in one transaction (all-or-nothing):
 * creates or updates `upserts` and soft-deletes `deletes`. An upsert of a
 * soft-deleted block revives it (e.g. after undo in the editor).
 */
export async function saveBlockChanges(
  db: LearningNotesDB,
  pageId: string,
  changes: BlockChanges,
): Promise<void> {
  if (changes.upserts.length === 0 && changes.deletes.length === 0) return

  const now = Date.now()
  const saved = await db.transaction('rw', db.pages, db.blocks, async () => {
    await getLive(db.pages, pageId)

    const existing = await db.blocks.bulkGet(changes.upserts.map((u) => u.id))
    const records = changes.upserts.map((upsert, i): Block => {
      const old = existing[i]
      if (!old) return { ...newRecordFields(), ...upsert, pageId }
      if (old.pageId !== pageId) {
        throw new Error(`Block ${old.id} belongs to another page`)
      }
      return { ...old, ...upsert, updatedAt: now, deletedAt: null }
    })
    await db.blocks.bulkPut(records)

    const toDelete = (await db.blocks.bulkGet(changes.deletes))
      .filter((b): b is Block => !!b && isLive(b) && b.pageId === pageId)
      .map((b) => b.id)
    await softDeleteMany(db.blocks, toDelete, now)
    return records
  })

  // A ticked checklist line also ticks the Home task linked to it (F1). A
  // separate step (its own transaction, outside any the caller holds): a
  // failure here never loses the note.
  if (saved.some((b) => b.type === 'checkListItem')) {
    try {
      await Dexie.ignoreTransaction(() => syncTasksFromBlocks(db, saved, now))
    } catch (error) {
      console.error('Could not update the linked Home task', error)
    }
  }
}

/**
 * Copies all live blocks of one page onto another (e.g. from a template).
 * Copies get new ids; nesting and order are kept. Blocks of `skipTypes`
 * (and anything nested inside them) are left out. `rewrite` can change a
 * block's content (return new content) or leave it out (return null).
 */
export async function copyBlocks(
  db: LearningNotesDB,
  fromPageId: string,
  toPageId: string,
  skipTypes: readonly string[] = [],
  rewrite: (block: Block) => JsonObject | null | undefined = () => undefined,
): Promise<void> {
  await db.transaction('rw', db.pages, db.blocks, async () => {
    await getLive(db.pages, toPageId)
    const source = await listBlocks(db, fromPageId)
    const contents = new Map(source.map((b) => [b.id, rewrite(b)]))
    const skipped = new Set(
      source
        .filter(
          (b) => skipTypes.includes(b.type) || contents.get(b.id) === null,
        )
        .map((b) => b.id),
    )
    for (const id of [...skipped]) {
      descendantIds(source, id).forEach((d) => skipped.add(d))
    }

    const newIds = new Map(source.map((b) => [b.id, createId()]))
    const now = Date.now()
    const copies = source
      .filter((b) => !skipped.has(b.id))
      .map((b): Block => ({
        ...b,
        id: newIds.get(b.id)!,
        pageId: toPageId,
        parentId: b.parentId === null ? null : (newIds.get(b.parentId) ?? null),
        content: structuredClone(contents.get(b.id) ?? b.content),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }))
    await db.blocks.bulkAdd(copies)
  })
}

/** Soft-deletes a block and all blocks nested inside it. */
export async function deleteBlock(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', db.blocks, async () => {
    const block = await getLive(db.blocks, id)
    const blocks = await listBlocks(db, block.pageId)
    await softDeleteMany(
      db.blocks,
      [id, ...descendantIds(blocks, id)],
      Date.now(),
    )
  })
}
