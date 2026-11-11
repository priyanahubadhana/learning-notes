import type { LearningNotesDB } from '../core/db'
import { purgeBooksOf } from '../core/bookPurge'
import { purgeRecordingsOf } from '../core/recordingPurge'
import { purgeSummaryOf } from '../core/summaryService'
import { purgeInkOf } from '../core/inkService'
import { imagesUsedBy, purgeUnusedImages } from '../core/imagePurge'
import { byOrder, orderAtIndex } from '../core/order'
import {
  descendantIds,
  isInTrash,
  isLive,
  purgeMany,
  restoreMany,
} from '../core/records'
import type {
  BaseRecord,
  Card,
  Database,
  DbColumn,
  DbView,
  Notebook,
  Page,
} from '../core/types'
import { restoreDatabaseParts, rowPagesOf } from '../databases/databaseParts'

/**
 * Trash: deleted notebooks, databases and pages, with Restore and Delete
 * forever.
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
      kind: 'database'
      id: string
      title: string
      deletedAt: number
      /** Rows deleted together with the database. */
      rowCount: number
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
  const databases = await db.databases
    .where('workspaceId')
    .equals(workspaceId)
    .toArray()
  const databaseById = new Map(databases.map((d) => [d.id, d]))

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
  for (const database of databases) {
    if (!isInTrash(database) || database.deletedAt === null) continue
    // Skip databases deleted as part of their notebook.
    const notebook = database.notebookId
      ? notebookById.get(database.notebookId)
      : undefined
    if (notebook?.deletedAt === database.deletedAt) continue
    items.push({
      kind: 'database',
      id: database.id,
      title: database.title,
      deletedAt: database.deletedAt,
      rowCount: pages.filter(
        (p) =>
          p.databaseId === database.id && p.deletedAt === database.deletedAt,
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
    const database = page.databaseId
      ? databaseById.get(page.databaseId)
      : undefined
    if (database?.deletedAt === page.deletedAt) continue
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

/**
 * Restores a notebook with the pages, blocks and databases deleted
 * together with it.
 */
export async function restoreNotebook(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', restoreTables(db), async () => {
    const notebook = await getTrashed<Notebook>(db.notebooks, id)
    const now = Date.now()
    const pageIds = (await db.pages.where('notebookId').equals(id).toArray())
      .filter((p) => p.deletedAt === notebook.deletedAt)
      .map((p) => p.id)
    const blockIds = await blocksOf(db, pageIds, notebook.deletedAt)

    const databases = await db.databases
      .where('notebookId')
      .equals(id)
      .toArray()
    for (const database of databases) {
      if (database.deletedAt !== notebook.deletedAt) continue
      await restoreDatabaseParts(
        db,
        { ...database, deletedAt: notebook.deletedAt },
        now,
      )
    }
    await restoreMany(db.notebooks, [id], now)
    await restoreMany(db.pages, pageIds, now)
    await restoreMany(db.blocks, blockIds, now)
  })
}

/** Tables touched when restoring. */
function restoreTables(db: LearningNotesDB) {
  return [
    db.notebooks,
    db.pages,
    db.blocks,
    db.databases,
    db.dbColumns,
    db.dbViews,
  ]
}

/**
 * Restores a database with its columns, views and rows deleted together
 * with it. If its notebook is in Trash, the notebook comes back too (only
 * the notebook, not its other pages).
 */
export async function restoreDatabase(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', restoreTables(db), async () => {
    const database = await getTrashed<Database>(db.databases, id)
    const now = Date.now()
    if (database.notebookId !== null) {
      const notebook = await db.notebooks.get(database.notebookId)
      if (!notebook || notebook.purgedAt !== undefined) {
        throw new Error('The database’s notebook no longer exists')
      }
      if (notebook.deletedAt !== null) {
        await restoreMany(db.notebooks, [notebook.id], now)
      }
    }
    await restoreDatabaseParts(db, database, now)
  })
}

/**
 * Restores a page with the sub-pages and blocks deleted together with it.
 * - If its notebook is in Trash, the notebook comes back too (only the
 *   notebook, not its other pages).
 * - If its parent page is still deleted, it goes to the notebook's top level.
 * - A row of a database in Trash brings the database back too.
 */
export async function restorePage(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', restoreTables(db), async () => {
    const page = await getTrashed<Page>(db.pages, id)
    const now = Date.now()

    const notebook = await db.notebooks.get(page.notebookId)
    if (!notebook || notebook.purgedAt !== undefined) {
      throw new Error('The page’s notebook no longer exists')
    }
    if (notebook.deletedAt !== null) {
      await restoreMany(db.notebooks, [notebook.id], now)
    }
    const database = page.databaseId
      ? await db.databases.get(page.databaseId)
      : undefined
    if (database && database.purgedAt !== undefined) {
      throw new Error('The row’s database no longer exists')
    }
    if (database && database.deletedAt !== null) {
      await restoreDatabaseParts(
        db,
        { ...database, deletedAt: database.deletedAt },
        now,
      )
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
  await db.transaction('rw', purgeTables(db), async () => {
    await getTrashed<Notebook>(db.notebooks, id)
    const now = Date.now()
    const databases = await db.databases
      .where('notebookId')
      .equals(id)
      .toArray()
    await purgeDatabaseRecords(db, databases.filter(isInTrash), now)
    const pageIds = (await db.pages.where('notebookId').equals(id).toArray())
      .filter(isInTrash)
      .map((p) => p.id)
    const blockIds = await blocksOf(db, pageIds, null)
    const images = await imagesUsedBy(db, pageIds, blockIds)

    await purgeMany(db.notebooks, [id], { title: '' }, now)
    await purgePages(db, pageIds, now)
    await purgeMany(db.blocks, blockIds, { content: {} }, now)
    await purgeCardsOf(db, blockIds, now)
    await purgeUnusedImages(db, images, now)
  })
}

/** Deletes a page forever, with the sub-pages deleted together with it. */
export async function purgePage(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', purgeTables(db), async () => {
    const page = await getTrashed<Page>(db.pages, id)
    const now = Date.now()
    const pages = await db.pages
      .where('notebookId')
      .equals(page.notebookId)
      .toArray()
    const pageIds = deletedTogether(pages, page)
    const blockIds = await blocksOf(db, pageIds, null)
    const images = await imagesUsedBy(db, pageIds, blockIds)

    await purgePages(db, pageIds, now)
    await purgeMany(db.blocks, blockIds, { content: {} }, now)
    await purgeCardsOf(db, blockIds, now)
    await purgeUnusedImages(db, images, now)
  })
}

/**
 * Deletes a database forever: erases it, its columns and views, and its
 * deleted rows (with their sub-pages, blocks and cards).
 */
export async function purgeDatabase(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', purgeTables(db), async () => {
    const database = await getTrashed<Database>(db.databases, id)
    await purgeDatabaseRecords(db, [database], Date.now())
  })
}

/** Tables touched when deleting forever. */
function purgeTables(db: LearningNotesDB) {
  return [
    db.notebooks,
    db.pages,
    db.blocks,
    db.cards,
    db.reviewLogs,
    db.databases,
    db.dbColumns,
    db.dbViews,
    db.rowRefs,
    db.pageVersions,
    db.inkLayers,
    db.inkChunks,
    db.recordings,
    db.bookFiles,
    db.images,
    db.annotations,
    db.summaryItems,
  ]
}

/** Erases pages (title, tags, cell values) and their relation entries. */
async function purgePages(
  db: LearningNotesDB,
  pageIds: string[],
  now: number,
): Promise<void> {
  const emptied: Partial<Page> = {
    title: '',
    tagIds: undefined,
    values: undefined,
    coverImageId: undefined,
  }
  await purgeMany(db.pages, pageIds, emptied, now)
  await db.rowRefs.where('fromPageId').anyOf(pageIds).delete()
  await db.pageVersions.where('pageId').anyOf(pageIds).delete() // history copies
  await purgeInkOf(db, pageIds, now) // drawings
  await purgeRecordingsOf(db, pageIds, now) // voice recordings
  await purgeBooksOf(db, pageIds, now) // book files, highlights and notes
  await purgeSummaryOf(db, pageIds, now) // Summary lines
}

/** Erases databases in Trash with their columns, views and deleted rows. */
async function purgeDatabaseRecords(
  db: LearningNotesDB,
  databases: Database[],
  now: number,
): Promise<void> {
  for (const database of databases) {
    const columnIds = (
      await db.dbColumns.where('databaseId').equals(database.id).toArray()
    )
      .filter(isInTrash)
      .map((c) => c.id)
    const viewIds = (
      await db.dbViews.where('databaseId').equals(database.id).toArray()
    )
      .filter(isInTrash)
      .map((v) => v.id)
    const pageIds = (await rowPagesOf(db, database))
      .filter(isInTrash)
      .map((p) => p.id)
    const blockIds = await blocksOf(db, pageIds, null)
    const images = await imagesUsedBy(db, pageIds, blockIds)

    const emptiedDb: Partial<Database> = { title: '', titleName: undefined }
    const emptiedColumn: Partial<DbColumn> = { name: '', config: {} }
    const emptiedView: Partial<DbView> = { name: '', config: {} }
    await purgeMany(db.databases, [database.id], emptiedDb, now)
    await purgeMany(db.dbColumns, columnIds, emptiedColumn, now)
    await purgeMany(db.dbViews, viewIds, emptiedView, now)
    await purgePages(db, pageIds, now)
    await purgeMany(db.blocks, blockIds, { content: {} }, now)
    await purgeCardsOf(db, blockIds, now)
    await purgeUnusedImages(db, images, now)
  }
}
