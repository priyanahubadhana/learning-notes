import type { LearningNotesDB } from '../core/db'
import { newRecordFields } from '../core/records'
import { orderBetween } from '../core/order'
import type { DbView } from '../core/types'
import { t } from '../i18n/t'
import { getDatabase } from './databaseService'

/**
 * The own view of a "/database" block: a copy of a database's view with
 * its own sorts and filters, so the same database can sit in several
 * notes looking different. Stored as a `DbView` with `blockId` set (not
 * listed with the database's own views).
 */

/** The block's live view, if it has one. */
export async function getBlockView(
  db: LearningNotesDB,
  databaseId: string,
  blockId: string,
): Promise<DbView | undefined> {
  const views = await db.dbViews
    .where('databaseId')
    .equals(databaseId)
    .toArray()
  return views.find((v) => v.blockId === blockId && v.deletedAt === null)
}

/** The block's view; made (a Table) the first time it is needed. */
export async function ensureBlockView(
  db: LearningNotesDB,
  databaseId: string,
  blockId: string,
): Promise<DbView | undefined> {
  return db.transaction('rw', db.databases, db.dbViews, async () => {
    if (!(await getDatabase(db, databaseId))) return undefined
    const existing = await getBlockView(db, databaseId, blockId)
    if (existing) return existing
    const view: DbView = {
      ...newRecordFields(),
      databaseId,
      blockId,
      name: t('database.view.table'),
      type: 'table',
      config: {},
      order: orderBetween(null, null),
    }
    await db.dbViews.add(view)
    return view
  })
}

/** Switches the block's view to another type (Table, Dashboard, Board). */
export async function setBlockViewType(
  db: LearningNotesDB,
  viewId: string,
  type: string,
): Promise<void> {
  await db.dbViews.update(viewId, { type, updatedAt: Date.now() })
}
