import type { LearningNotesDB } from '../core/db'
import { byOrder, orderAtIndex, orderBetween } from '../core/order'
import {
  getLive,
  isLive,
  newRecordFields,
  softDeleteMany,
} from '../core/records'
import type { Notebook } from '../core/types'

/**
 * Notebook operations. UI code should call these instead of touching the
 * database directly, so rules (ordering, soft delete) live in one place.
 */

/** Returns a live notebook, or undefined if it is missing or deleted. */
export async function getNotebook(
  db: LearningNotesDB,
  id: string,
): Promise<Notebook | undefined> {
  const notebook = await db.notebooks.get(id)
  return notebook && isLive(notebook) ? notebook : undefined
}

/** Lists the live notebooks in a workspace, in display order. */
export async function listNotebooks(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Notebook[]> {
  const all = await db.notebooks
    .where('workspaceId')
    .equals(workspaceId)
    .toArray()
  return all.filter(isLive).sort(byOrder)
}

/** Creates a notebook at the end of the list. */
export async function createNotebook(
  db: LearningNotesDB,
  workspaceId: string,
  title = 'Untitled',
): Promise<Notebook> {
  return db.transaction('rw', db.workspaces, db.notebooks, async () => {
    await getLive(db.workspaces, workspaceId)
    const last = (await listNotebooks(db, workspaceId)).at(-1)
    const notebook: Notebook = {
      ...newRecordFields(),
      workspaceId,
      title,
      order: orderBetween(last?.order ?? null, null),
    }
    await db.notebooks.add(notebook)
    return notebook
  })
}

/** Renames a notebook. */
export async function renameNotebook(
  db: LearningNotesDB,
  id: string,
  title: string,
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    await getLive(db.notebooks, id)
    await db.notebooks.update(id, { title, updatedAt: Date.now() })
  })
}

/** Moves a notebook to `toIndex` in the list (0 = top). */
export async function moveNotebook(
  db: LearningNotesDB,
  id: string,
  toIndex: number,
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    const notebook = await getLive(db.notebooks, id)
    const siblings = (await listNotebooks(db, notebook.workspaceId)).filter(
      (n) => n.id !== id,
    )
    const order = orderAtIndex(
      siblings.map((n) => n.order),
      toIndex,
    )
    await db.notebooks.update(id, { order, updatedAt: Date.now() })
  })
}

/** Soft-deletes a notebook together with all its pages and their blocks. */
export async function deleteNotebook(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', db.notebooks, db.pages, db.blocks, async () => {
    await getLive(db.notebooks, id)
    const deletedAt = Date.now()

    const pageIds = (await db.pages.where('notebookId').equals(id).toArray())
      .filter(isLive)
      .map((p) => p.id)
    const blockIds = (await db.blocks.where('pageId').anyOf(pageIds).toArray())
      .filter(isLive)
      .map((b) => b.id)

    await softDeleteMany(db.notebooks, [id], deletedAt)
    await softDeleteMany(db.pages, pageIds, deletedAt)
    await softDeleteMany(db.blocks, blockIds, deletedAt)
  })
}
