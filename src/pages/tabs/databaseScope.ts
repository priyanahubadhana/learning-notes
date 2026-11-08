import type { LearningNotesDB } from '../../core/db'
import { isLive } from '../../core/records'
import type { Page } from '../../core/types'
import { listDatabases } from '../../databases/databaseService'

export const DB_SCOPES = ['page', 'sub', 'notebook'] as const
export type DbScope = (typeof DB_SCOPES)[number]

/** The page and (for "sub") everything under it. */
export function pageIdsOf(
  pages: readonly Pick<Page, 'id' | 'parentId'>[],
  rootId: string,
  withSub: boolean,
): string[] {
  const ids = [rootId]
  if (!withSub) return ids
  for (let i = 0; i < ids.length; i++) {
    for (const p of pages) if (p.parentId === ids[i]) ids.push(p.id)
  }
  return ids
}

/**
 * The databases a page's Database tab shows: those placed on the page (and
 * its sub-pages) or, for the whole notebook, every database of the notebook.
 */
export async function scopedDatabaseIds(
  db: LearningNotesDB,
  workspaceId: string,
  page: Pick<Page, 'id' | 'notebookId'>,
  scope: DbScope,
): Promise<string[]> {
  const seen = new Set<string>()
  const pages = (
    await db.pages.where('notebookId').equals(page.notebookId).toArray()
  ).filter(isLive)
  const ids =
    scope === 'notebook'
      ? pages.map((p) => p.id)
      : pageIdsOf(pages, page.id, scope === 'sub')
  const blocks = await db.blocks.where('pageId').anyOf(ids).toArray()
  for (const b of blocks) {
    if (
      isLive(b) &&
      b.type === 'database' &&
      typeof b.content.databaseId === 'string' &&
      b.content.databaseId
    ) {
      seen.add(b.content.databaseId)
    }
  }
  if (scope === 'notebook') {
    for (const d of await listDatabases(db, workspaceId)) {
      if (d.notebookId === page.notebookId) seen.add(d.id)
    }
  }
  const live = await db.databases.bulkGet([...seen])
  return live.filter((d) => !!d && isLive(d) && !d.kind).map((d) => d!.id)
}
