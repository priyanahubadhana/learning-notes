import type { LearningNotesDB } from '../core/db'
import {
  descendantIds,
  isLive,
  restoreMany,
  softDeleteMany,
} from '../core/records'
import type { Database, DbColumn, Page } from '../core/types'

/**
 * Deleting and restoring a database with everything that belongs to it
 * (columns, views, row pages, their blocks, two-way partner columns).
 * Kept apart from databaseService so notebook and Trash code can use it.
 */

/** Row pages of a database with their sub-pages (any state). */
export async function rowPagesOf(
  db: LearningNotesDB,
  database: Database,
): Promise<Page[]> {
  const rows = await db.pages.where('databaseId').equals(database.id).toArray()
  if (rows.length === 0) return []
  const notebookIds = [...new Set(rows.map((r) => r.notebookId))]
  const all = await db.pages.where('notebookId').anyOf(notebookIds).toArray()
  const ids = new Set(rows.map((r) => r.id))
  for (const row of rows) {
    for (const id of descendantIds(all, row.id)) ids.add(id)
  }
  return all.filter((p) => ids.has(p.id))
}

/**
 * Two-way partners in other databases of this database's relation
 * columns (they show nothing once this database is gone).
 */
async function partnersElsewhere(
  db: LearningNotesDB,
  databaseId: string,
  columns: DbColumn[],
): Promise<DbColumn[]> {
  const partnerIds = columns.flatMap((c) =>
    typeof c.config.pairedColumnId === 'string'
      ? [c.config.pairedColumnId]
      : [],
  )
  const partners = await db.dbColumns.bulkGet(partnerIds)
  return partners.filter(
    (p): p is DbColumn => p !== undefined && p.databaseId !== databaseId,
  )
}

/**
 * Soft-deletes a database and everything that belongs to it at
 * `deletedAt` (also used when its notebook is deleted).
 */
export async function softDeleteDatabaseParts(
  db: LearningNotesDB,
  database: Database,
  deletedAt: number,
): Promise<void> {
  const columns = (
    await db.dbColumns.where('databaseId').equals(database.id).toArray()
  ).filter(isLive)
  const partners = (await partnersElsewhere(db, database.id, columns)).filter(
    isLive,
  )
  const views = (
    await db.dbViews.where('databaseId').equals(database.id).toArray()
  ).filter(isLive)
  const pages = (await rowPagesOf(db, database)).filter(isLive)
  const blockIds = (
    await db.blocks
      .where('pageId')
      .anyOf(pages.map((p) => p.id))
      .toArray()
  )
    .filter(isLive)
    .map((b) => b.id)

  await softDeleteMany(db.databases, [database.id], deletedAt)
  await softDeleteMany(
    db.dbColumns,
    [...columns, ...partners].map((c) => c.id),
    deletedAt,
  )
  await softDeleteMany(
    db.dbViews,
    views.map((v) => v.id),
    deletedAt,
  )
  await softDeleteMany(
    db.pages,
    pages.map((p) => p.id),
    deletedAt,
  )
  await softDeleteMany(db.blocks, blockIds, deletedAt)
}

/**
 * Restores a deleted database with everything deleted together with it
 * (Trash → Restore). Its notebook must not be in Trash.
 */
export async function restoreDatabaseParts(
  db: LearningNotesDB,
  database: Database & { deletedAt: number },
  now: number,
): Promise<void> {
  const at = database.deletedAt
  const columns = (
    await db.dbColumns.where('databaseId').equals(database.id).toArray()
  ).filter((c) => c.deletedAt === at)
  const partners = (await partnersElsewhere(db, database.id, columns)).filter(
    (c) => c.deletedAt === at,
  )
  const viewIds = (
    await db.dbViews.where('databaseId').equals(database.id).toArray()
  )
    .filter((v) => v.deletedAt === at)
    .map((v) => v.id)
  const pageIds = (await rowPagesOf(db, database))
    .filter((p) => p.deletedAt === at)
    .map((p) => p.id)
  const blockIds = (await db.blocks.where('pageId').anyOf(pageIds).toArray())
    .filter((b) => b.deletedAt === at)
    .map((b) => b.id)

  await restoreMany(db.databases, [database.id], now)
  await restoreMany(
    db.dbColumns,
    [...columns, ...partners].map((c) => c.id),
    now,
  )
  await restoreMany(db.dbViews, viewIds, now)
  await restoreMany(db.pages, pageIds, now)
  await restoreMany(db.blocks, blockIds, now)
}
