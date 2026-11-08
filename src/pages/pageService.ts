import type { LearningNotesDB } from '../core/db'
import { byOrder, orderAtIndex } from '../core/order'
import {
  descendantIds,
  getLive,
  isLive,
  newRecordFields,
  softDeleteMany,
  stableRecordFields,
} from '../core/records'
import type { Page } from '../core/types'
import type { PathStyle } from './pathStyle'

/**
 * Page operations. Pages live in a notebook and can nest under other pages
 * (parentId). UI code should call these instead of the database directly.
 */

/** All live pages in a notebook (any depth, unsorted). */
async function livePages(
  db: LearningNotesDB,
  notebookId: string,
): Promise<Page[]> {
  const all = await db.pages.where('notebookId').equals(notebookId).toArray()
  return all.filter(isLive)
}

/** Returns a live page, or undefined if it is missing or deleted. */
export async function getPage(
  db: LearningNotesDB,
  id: string,
): Promise<Page | undefined> {
  const page = await db.pages.get(id)
  return page && isLive(page) ? page : undefined
}

/**
 * All live pages in a notebook (any depth), sorted by order, so siblings
 * are in display order. Use parentId to rebuild the nesting.
 */
export async function listPages(
  db: LearningNotesDB,
  notebookId: string,
): Promise<Page[]> {
  return (await livePages(db, notebookId)).sort(byOrder)
}

/**
 * The pages of a notebook's Notes tree: like listPages, but without
 * database row pages and their sub-pages (they open from their database).
 */
export async function listNotePages(
  db: LearningNotesDB,
  notebookId: string,
): Promise<Page[]> {
  const pages = await listPages(db, notebookId)
  const rowIds = pages.filter((p) => p.databaseId).map((p) => p.id)
  if (rowIds.length === 0) return pages
  const hidden = new Set(rowIds)
  for (const id of rowIds) {
    for (const child of descendantIds(pages, id)) hidden.add(child)
  }
  return pages.filter((p) => !hidden.has(p.id))
}

/**
 * The chain of pages from the top level down to `pageId` (inclusive),
 * e.g. for a breadcrumb. Empty if the page is missing or deleted.
 */
export async function getPagePath(
  db: LearningNotesDB,
  pageId: string,
): Promise<Page[]> {
  const path: Page[] = []
  let id: string | null = pageId
  while (id !== null && !path.some((p) => p.id === id)) {
    const page = await getPage(db, id)
    if (!page) break
    path.unshift(page)
    id = page.parentId
  }
  return path[path.length - 1]?.id === pageId ? path : []
}

/** Lists the direct children of `parentId` (null = top level), in order. */
export async function listChildPages(
  db: LearningNotesDB,
  notebookId: string,
  parentId: string | null,
): Promise<Page[]> {
  return (await livePages(db, notebookId))
    .filter((p) => p.parentId === parentId)
    .sort(byOrder)
}

/** Checks that a parent page exists in the same notebook (null = top level). */
async function assertValidParent(
  db: LearningNotesDB,
  notebookId: string,
  parentId: string | null,
): Promise<void> {
  if (parentId === null) return
  const parent = await getLive(db.pages, parentId)
  if (parent.notebookId !== notebookId) {
    throw new Error('Parent page must be in the same notebook')
  }
}

/** Sets the paper behind a page's ink (lined, grid, dots; undefined = plain). */
export async function setPageInkBg(
  db: LearningNotesDB,
  id: string,
  inkBg: Page['inkBg'],
): Promise<void> {
  await getLive(db.pages, id)
  await db.pages.update(id, { inkBg, updatedAt: Date.now() })
}

/** Sets the sheet size of a page's paper (A4 or Letter; undefined = A4). */
export async function setPageSheet(
  db: LearningNotesDB,
  id: string,
  sheet: Page['sheet'],
): Promise<void> {
  await getLive(db.pages, id)
  await db.pages.update(id, { sheet, updatedAt: Date.now() })
}

/** Creates a page at the end of its siblings (top level if parentId is null). */
export async function createPage(
  db: LearningNotesDB,
  notebookId: string,
  parentId: string | null = null,
  title = '', // empty: the UI shows an "Untitled" placeholder
  /** Optional journal/template markers (see Page). */
  extra: Pick<Page, 'journalDate' | 'journalMonth' | 'templateRole'> = {},
): Promise<Page> {
  return db.transaction('rw', db.notebooks, db.pages, async () => {
    await getLive(db.notebooks, notebookId)
    await assertValidParent(db, notebookId, parentId)
    const siblings = await listChildPages(db, notebookId, parentId)
    // Journal day/month pages and template roles get a fixed id (sync L1).
    const role = extra.journalDate
      ? `day:${extra.journalDate}`
      : extra.journalMonth
        ? `month:${extra.journalMonth}`
        : extra.templateRole
          ? `template:${extra.templateRole}`
          : undefined
    const page: Page = {
      ...(role
        ? await stableRecordFields(db.pages, `${notebookId}:${role}`)
        : newRecordFields()),
      notebookId,
      parentId,
      title,
      order: orderAtIndex(
        siblings.map((p) => p.order),
        siblings.length,
      ),
      ...extra,
    }
    await db.pages.add(page)
    return page
  })
}

/** Sets (or, with undefined, clears) a page's own path style. */
export async function setPagePathStyle(
  db: LearningNotesDB,
  id: string,
  pathStyle: PathStyle | undefined,
): Promise<void> {
  await db.transaction('rw', db.pages, async () => {
    await getLive(db.pages, id)
    await db.pages.update(id, { pathStyle, updatedAt: Date.now() })
  })
}

/** Renames a page. */
export async function renamePage(
  db: LearningNotesDB,
  id: string,
  title: string,
): Promise<void> {
  await db.transaction('rw', db.pages, async () => {
    const page = await getLive(db.pages, id)
    await db.pages.update(id, {
      title,
      updatedAt: Date.now(),
      ...((page.journalDate || page.journalMonth) && { customTitle: true }),
    })
  })
}

/**
 * Moves a page under `newParentId` (null = top level) at `toIndex` among
 * its new siblings. A page cannot be moved inside itself or its own sub-pages.
 */
export async function movePage(
  db: LearningNotesDB,
  id: string,
  newParentId: string | null,
  toIndex: number,
): Promise<void> {
  await db.transaction('rw', db.pages, async () => {
    const page = await getLive(db.pages, id)
    await assertValidParent(db, page.notebookId, newParentId)

    const pages = await livePages(db, page.notebookId)
    if (
      newParentId !== null &&
      (newParentId === id || descendantIds(pages, id).includes(newParentId))
    ) {
      throw new Error('A page cannot be moved inside itself')
    }

    const siblings = pages
      .filter((p) => p.parentId === newParentId && p.id !== id)
      .sort(byOrder)
    const order = orderAtIndex(
      siblings.map((p) => p.order),
      toIndex,
    )
    // Pages stay in their notebook, so cards' copied `pageId`/`notebookId`
    // stay right. A future "move to another notebook" must update them too.
    await db.pages.update(id, {
      parentId: newParentId,
      order,
      updatedAt: Date.now(),
    })
  })
}

/**
 * Makes a sub-page a normal (top-level) page of its notebook, placed at the
 * end. Its own sub-pages and content move with it.
 */
export async function movePageToTopLevel(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await movePage(db, id, null, Number.MAX_SAFE_INTEGER)
}

/** Soft-deletes a page, all its sub-pages, and all their blocks. */
export async function deletePage(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.transaction('rw', db.pages, db.blocks, async () => {
    const page = await getLive(db.pages, id)
    const pages = await livePages(db, page.notebookId)
    const pageIds = [id, ...descendantIds(pages, id)]
    if (
      pages.some((p) => pageIds.includes(p.id) && p.templateRole === 'daily')
    ) {
      throw new Error('The Daily journal template is protected')
    }
    const deletedAt = Date.now()
    const blockIds = (await db.blocks.where('pageId').anyOf(pageIds).toArray())
      .filter(isLive)
      .map((b) => b.id)

    await softDeleteMany(db.pages, pageIds, deletedAt)
    await softDeleteMany(db.blocks, blockIds, deletedAt)
  })
}
