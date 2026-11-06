import type { LearningNotesDB } from '../core/db'
import { getLive } from '../core/records'
import type { Notebook, Page, TabView } from '../core/types'

/**
 * I1 · Views of a notebook. The notebook View menu (Default, Shelf, Tabs)
 * and the view of each tab (list, gallery, table, board) are saved on the
 * notebook; a section tab's colour is saved on its page.
 */

export const TAB_VIEWS: readonly TabView[] = [
  'list',
  'gallery',
  'table',
  'board',
]

/** Sets (or, with undefined, clears) how a notebook shows its pages. */
export async function setNotebookView(
  db: LearningNotesDB,
  id: string,
  view: Notebook['view'] | undefined,
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    await getLive(db.notebooks, id)
    await db.notebooks.update(id, { view, updatedAt: Date.now() })
  })
}

/** Remembers the view of one tab ('list' is the default and is not stored). */
export async function setTabView(
  db: LearningNotesDB,
  id: string,
  tabId: string,
  view: TabView,
): Promise<void> {
  await db.transaction('rw', db.notebooks, async () => {
    const notebook = await getLive(db.notebooks, id)
    const next = { ...notebook.tabViews }
    if (view === 'list') delete next[tabId]
    else next[tabId] = view
    await db.notebooks.update(id, {
      tabViews: Object.keys(next).length ? next : undefined,
      updatedAt: Date.now(),
    })
  })
}

/** Sets (or clears) the colour of a page's section tab. */
export async function setPageTabColour(
  db: LearningNotesDB,
  pageId: string,
  colour: string | undefined,
): Promise<void> {
  await db.transaction('rw', db.pages, async () => {
    await getLive(db.pages, pageId)
    await db.pages.update(pageId, { tabColour: colour, updatedAt: Date.now() })
  })
}

/** The view a tab shows: its saved one, else the list. */
export const tabViewOf = (notebook: Notebook, tabId: string): TabView =>
  notebook.tabViews?.[tabId] ?? 'list'

/** Top-level pages grouped by section colour, for the board ('' = no colour). */
export function groupByColour(pages: readonly Page[]): Map<string, Page[]> {
  const groups = new Map<string, Page[]>()
  for (const page of pages) {
    const key = page.tabColour ?? ''
    groups.set(key, [...(groups.get(key) ?? []), page])
  }
  return groups
}
