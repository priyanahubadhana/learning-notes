import type { LearningNotesDB } from '../core/db'
import { EditLockedError } from '../core/editLock'
import { byOrder, orderAtIndex, orderBetween } from '../core/order'
import {
  getLive,
  isLive,
  newRecordFields,
  softDeleteMany,
  stableRecordFields,
} from '../core/records'
import type { Notebook, NotebookTab } from '../core/types'
import { softDeleteDatabaseParts } from '../databases/databaseParts'
import { defaultNotebookTabs } from '../databases/notebookTabs'
import type { PathStyle } from '../pages/pathStyle'
import { defaultPageTabs } from './pageTabs'

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

/**
 * Lists the live notebooks in a workspace, in display order. The Templates
 * notebook is left out (it has its own sidebar section), and so is the
 * hidden home of rows of databases outside any notebook.
 */
export async function listNotebooks(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Notebook[]> {
  const all = await db.notebooks
    .where('workspaceId')
    .equals(workspaceId)
    .toArray()
  return all
    .filter(
      (n) => isLive(n) && n.kind !== 'templates' && n.kind !== 'databases',
    )
    .sort(byOrder)
}

/** Finds the live notebook of a special kind (journal or templates). */
export async function findNotebookOfKind(
  db: LearningNotesDB,
  workspaceId: string,
  kind: NonNullable<Notebook['kind']>,
): Promise<Notebook | undefined> {
  const all = await db.notebooks
    .where('workspaceId')
    .equals(workspaceId)
    .toArray()
  return all.filter((n) => isLive(n) && n.kind === kind).sort(byOrder)[0]
}

/** Creates a notebook at the end of the list. */
export async function createNotebook(
  db: LearningNotesDB,
  workspaceId: string,
  title = 'Untitled',
  kind?: Notebook['kind'],
): Promise<Notebook> {
  return db.transaction('rw', db.workspaces, db.notebooks, async () => {
    await getLive(db.workspaces, workspaceId)
    const last = (await listNotebooks(db, workspaceId)).at(-1)
    // Special notebooks get a fixed id per workspace (sync L1).
    const fields = kind
      ? await stableRecordFields(db.notebooks, `${workspaceId}:${kind}`)
      : newRecordFields()
    const notebook: Notebook = {
      ...fields,
      workspaceId,
      title,
      order: orderBetween(last?.order ?? null, null),
      // Special notebooks (journal, templates, …) have no tabs.
      ...(kind ? { kind } : { tabs: defaultNotebookTabs(fields.id) }),
      ...(!kind && defaultPageTabs().length > 0
        ? { pageTabs: defaultPageTabs() }
        : {}),
    }
    await db.notebooks.add(notebook)
    return notebook
  })
}

/** Sets (or, with undefined, clears) a notebook's path style. */
export async function setNotebookPathStyle(
  db: LearningNotesDB,
  id: string,
  pathStyle: PathStyle | undefined,
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    await getLive(db.notebooks, id)
    await db.notebooks.update(id, { pathStyle, updatedAt: Date.now() })
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

/**
 * Soft-deletes a notebook together with all its pages and their blocks,
 * and its databases (Study tracker included) with their columns and views.
 */
export async function deleteNotebook(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const tables = [
    db.notebooks,
    db.pages,
    db.blocks,
    db.databases,
    db.dbColumns,
    db.dbViews,
  ]
  await db.transaction('rw', tables, async () => {
    const notebook = await getLive(db.notebooks, id)
    // Edit lock: a locked notebook, or one holding a locked page, stays.
    if (
      notebook.editLocked ||
      (await db.pages.where('notebookId').equals(id).toArray()).some(
        (p) => isLive(p) && p.editLocked,
      )
    ) {
      throw new EditLockedError()
    }
    const deletedAt = Date.now()

    const databases = await db.databases
      .where('notebookId')
      .equals(id)
      .toArray()
    for (const database of databases.filter(isLive)) {
      await softDeleteDatabaseParts(db, database, deletedAt)
    }

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

/**
 * Renames and/or hides one of a notebook's tabs. `title` '' gives the tab
 * back its default name. The last visible tab cannot be hidden.
 */
export async function updateNotebookTab(
  db: LearningNotesDB,
  notebookId: string,
  tabId: string,
  changes: { title?: string; hidden?: boolean },
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    const notebook = await getLive(db.notebooks, notebookId)
    const tabs = notebook.tabs ?? []
    if (!tabs.some((tab) => tab.id === tabId)) {
      throw new Error(`Unknown tab: ${tabId}`)
    }
    const next = tabs.map((tab) => {
      if (tab.id !== tabId) return tab
      const title = (changes.title ?? tab.title ?? '').trim().slice(0, 100)
      const hidden = changes.hidden ?? tab.hidden ?? false
      const updated: NotebookTab = { ...tab, title, hidden }
      // Unset = default name / shown (keeps stored records small).
      if (!title) delete updated.title
      if (!hidden) delete updated.hidden
      return updated
    })
    if (next.every((tab) => tab.hidden)) {
      throw new Error('A notebook keeps one visible tab')
    }
    await db.notebooks.update(notebookId, {
      tabs: next,
      updatedAt: Date.now(),
    })
  })
}
/** Pins a notebook to the top of the Notebooks home (or unpins it). */
export async function setNotebookStarred(
  db: LearningNotesDB,
  id: string,
  starred: boolean,
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    await getLive(db.notebooks, id)
    await db.notebooks.update(id, {
      starred: starred ? true : undefined,
      updatedAt: Date.now(),
    })
  })
}

/** Sets a notebook cover: its colour and/or the first page as the cover. */
export async function setNotebookCover(
  db: LearningNotesDB,
  id: string,
  change: { colour?: string; cover?: 'page' | undefined },
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    await getLive(db.notebooks, id)
    await db.notebooks.update(id, { ...change, updatedAt: Date.now() })
  })
}
