import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { getPage, listNotePages } from '../pages/pageService'
import { readPref, writePref } from '../app/uiPrefs'

/**
 * R6-12: tapping a notebook reopens the page you last had open in it. The
 * last page of each notebook is a per-device convenience (like the open page
 * and the recent pages), not synced.
 */

export const OPEN_NOTEBOOK_AT = ['last', 'first', 'tabs'] as const
export type OpenNotebookAt = (typeof OPEN_NOTEBOOK_AT)[number]
export const isOpenNotebookAt = (v: unknown): v is OpenNotebookAt =>
  (OPEN_NOTEBOOK_AT as readonly unknown[]).includes(v)

const KEY = 'lastPageByNotebook'
/** Notebooks remembered (the oldest drop out). */
const KEEP = 200

type Remembered = Record<string, string>
const isRemembered = (v: unknown): v is Remembered =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'string')

export function rememberNotebookPage(notebookId: string, pageId: string): void {
  const all = readPref(KEY, isRemembered, {})
  if (all[notebookId] === pageId) return
  const rest = { ...all }
  delete rest[notebookId]
  const entries = Object.entries({ ...rest, [notebookId]: pageId })
  writePref(KEY, Object.fromEntries(entries.slice(-KEEP)))
}

export function lastPageOf(notebookId: string): string | undefined {
  return readPref(KEY, isRemembered, {})[notebookId]
}

/**
 * The page a tap on the notebook should open: its last page (when still
 * there), else its first page; null when the notebook has no pages.
 */
export async function pageForNotebook(
  db: LearningNotesDB,
  notebookId: string,
  mode: OpenNotebookAt,
): Promise<Page | null> {
  if (mode === 'tabs') return null
  if (mode === 'last') {
    const id = lastPageOf(notebookId)
    const page = id ? await getPage(db, id) : undefined
    if (page && page.notebookId === notebookId && !page.databaseId) return page
  }
  const pages = await listNotePages(db, notebookId)
  return pages.find((p) => !p.parentId) ?? pages[0] ?? null
}
