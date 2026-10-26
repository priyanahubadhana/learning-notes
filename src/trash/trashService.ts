import type { LearningNotesDB } from '../core/db'
import { byOrder, orderAtIndex } from '../core/order'
import {
  descendantIds,
  isInTrash,
  isLive,
  purgeMany,
  restoreMany,
} from '../core/records'
import type { BaseRecord, Card, Notebook, Page } from '../core/types'

/**
 * Trash: deleted notebooks and pages, with Restore and Delete forever.
 *
 * Things deleted together share the same `deletedAt` time, so Trash shows
 * only what the user deleted directly (e.g. a notebook, with its pages
 * inside it), and Restore brings back everything deleted at that moment.
 */

/** One entry in Trash. */
export type TrashItem =
  | {
      kind: 'notebook'
      id: string
      title: string
      deletedAt: number
      /** Pages deleted together with the notebook. */
      pageCount: number
    }
  | {
      kind: 'page'
      id: string
      title: string
      deletedAt: number
      notebookTitle: string
    }

/** Loads a record that is in Trash; throws otherwise. */
async function getTrashed<T extends BaseRecord>(
  table: { get: (id: string) => Promise<T | undefined>; name: string },
  id: string,
): Promise<T & { deletedAt: number }> {
  const record = await table.get(id)
  if (!record || !isInTrash(record) || record.deletedAt === null) {
    throw new Error(`${table.name}: not in Trash (${id})`)
  }
  return { ...record, deletedAt: record.deletedAt }
}

/** Lists Trash for a workspace, most recently deleted first. */
export async function listTrash(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<TrashItem[]> {
  const notebooks = await db.notebooks
    .where('workspaceId')
    .equals(workspaceId)
    .toArray()
  const notebookById = new Map(notebooks.map((n) => [n.id, n]))
  const pages = await db.pages
    .where('notebookId')
    .anyOf([...notebookById.keys()])
    .toArray()
  const pageById = new Map(pages.map((p) => [p.id, p]))

  const items: TrashItem[] = []
  for (const notebook of notebooks) {
    if (!isInTrash(notebook) || notebook.deletedAt === null) continue
    items.push({
      kind: 'notebook',
      id: notebook.id,
      title: notebook.title,
      deletedAt: notebook.deletedAt,
      pageCount: pages.filter(
        (p) =>
          p.notebookId === notebook.id && p.deletedAt === notebook.deletedAt,
      ).length,
    })
  }
  for (const page of pages) {
    if (!isInTrash(page) || page.deletedAt === null) continue
    // Skip pages deleted as part of their notebook or parent page.
    const notebook = notebookById.get(page.notebookId)
    const parent = page.parentId ? pageById.get(page.parentId) : undefined
    if (notebook?.deletedAt === page.deletedAt) continue
    if (parent?.deletedAt === page.deletedAt) continue
    items.push({
      kind: 'page',
      id: page.id,
      title: page.title,
      deletedAt: page.deletedAt,
      notebookTitle: notebook?.title ?? '',
    })
  }
  return items.sort((a, b) => b.deletedAt - a.deletedAt)
}

/** The page and its sub-pages that were deleted at the same moment. */
function deletedTogether(pages: Page[], page: Page & { deletedAt: number }) {
  const sameTime = pages.filter((p) => p.deletedAt === page.deletedAt)
  return [page.id, ...descendantIds(sameTime, page.id)]
}

/** Blocks on `pageIds` deleted at `deletedAt` (or any time, if null). */
async function blocksOf(
  db: LearningNotesDB,
  pageIds: string[],
  deletedAt: number | null,
): Promise<string[]> {
  const blocks = await db.blocks.where('pageId').anyOf(pageIds).toArray()
  return blocks
    .filter((b) =>
      deletedAt === null ? isInTrash(b) : b.deletedAt === deletedAt,
    )
    .map((b) => b.id)
}

/**
 * Erases the recall cards of deleted-forever blocks and their review logs.
 * Both stay as small markers (id + `purgedAt`) for a future sync. Erased
 * cards get a far-future `due`, so due-card lookups never read them again.
 */
async function purgeCardsOf(
  db: LearningNotesDB,
  blockIds: string[],
  now: number,
): Promise<void> {
  const cardIds = (await db.cards.where('blockId').anyOf(blockIds).toArray())
    .filter((c) => c.purgedAt === undefined)
    .map((c) => c.id)
  if (cardIds.length === 0) return
  const emptied: Partial<Card> = {
    deletedAt: now,
    due: Number.MAX_SAFE_INTEGER,
    schedulerData: undefined,
  }
  await purgeMany(db.cards, cardIds, emptied, now)

  // Rating, kind and time are kept so today's review counts stay right.
  const logIds = await db.reviewLogs
    .where('cardId')
    .anyOf(cardIds)
    .primaryKeys()
  const changes = {
    durationMs: 0,
    dueBefore: 0,
    dueAfter: 0,
    intervalBefore: 0,
    intervalAfter: 0,
    stepAfter: 0,
    schedulerDataAfter: undefined,
    purgedAt: now,
  }
  await db.reviewLogs.bulkUpdate(logIds.map((key) => ({ key, changes })))
}

/** Restores a notebook with the pages and blocks deleted together with it. */
export async function restoreNotebook(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', db.notebooks, db.pages, db.blocks, async () => {
    const notebook = await getTrashed<Notebook>(db.notebooks, id)
    const now = Date.now()
    const pageIds = (await db.pages.where('notebookId').equals(id).toArray())
      .filter((p) => p.deletedAt === notebook.deletedAt)
      .map((p) => p.id)
    const blockIds = await blocksOf(db, pageIds, notebook.deletedAt)

    await restoreMany(db.notebooks, [id], now)
    await restoreMany(db.pages, pageIds, now)
    await restoreMany(db.blocks, blockIds, now)
  })
}

/**
 * Restores a page with the sub-pages and blocks deleted together with it.
 * - If its notebook is in Trash, the notebook comes back too (only the
 *   notebook, not its other pages).
 * - If its parent page is still deleted, it goes to the notebook's top level.
 */
export async function restorePage(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', db.notebooks, db.pages, db.blocks, async () => {
    const page = await getTrashed<Page>(db.pages, id)
    const now = Date.now()

    const notebook = await db.notebooks.get(page.notebookId)
    if (!notebook || notebook.purgedAt !== undefined) {
      throw new Error('The page’s notebook no longer exists')
    }
    if (notebook.deletedAt !== null) {
      await restoreMany(db.notebooks, [notebook.id], now)
    }

    const pages = await db.pages
      .where('notebookId')
      .equals(page.notebookId)
      .toArray()
    const pageIds = deletedTogether(pages, page)
    const blockIds = await blocksOf(db, pageIds, page.deletedAt)

    const parent = pages.find((p) => p.id === page.parentId)
    if (page.parentId !== null && (!parent || !isLive(parent))) {
      const topLevel = pages
        .filter((p) => isLive(p) && p.parentId === null)
        .sort(byOrder)
        .map((p) => p.order)
      await db.pages.update(id, {
        parentId: null,
        order: orderAtIndex(topLevel, topLevel.length),
      })
    }
    await restoreMany(db.pages, pageIds, now)
    await restoreMany(db.blocks, blockIds, now)
  })
}

/**
 * Deletes a notebook forever: erases it and all its deleted pages and
 * blocks (they could never be restored without it).
 */
export async function purgeNotebook(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const tables = [db.notebooks, db.pages, db.blocks, db.cards, db.reviewLogs]
  await db.transaction('rw', tables, async () => {
    await getTrashed<Notebook>(db.notebooks, id)
    const now = Date.now()
    const pageIds = (await db.pages.where('notebookId').equals(id).toArray())
      .filter(isInTrash)
      .map((p) => p.id)
    const blockIds = await blocksOf(db, pageIds, null)

    await purgeMany(db.notebooks, [id], { title: '' }, now)
    await purgeMany(db.pages, pageIds, { title: '' }, now)
    await purgeMany(db.blocks, blockIds, { content: {} }, now)
    await purgeCardsOf(db, blockIds, now)
  })
}

/** Deletes a page forever, with the sub-pages deleted together with it. */
export async function purgePage(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const tables = [db.pages, db.blocks, db.cards, db.reviewLogs]
  await db.transaction('rw', tables, async () => {
    const page = await getTrashed<Page>(db.pages, id)
    const now = Date.now()
    const pages = await db.pages
      .where('notebookId')
      .equals(page.notebookId)
      .toArray()
    const pageIds = deletedTogether(pages, page)
    const blockIds = await blocksOf(db, pageIds, null)

    await purgeMany(db.pages, pageIds, { title: '' }, now)
    await purgeMany(db.blocks, blockIds, { content: {} }, now)
    await purgeCardsOf(db, blockIds, now)
  })
}
