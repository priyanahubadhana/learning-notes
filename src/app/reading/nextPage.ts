import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { listNotePages } from '../../pages/pageService'

/** Pages in reading order: each page, then its sub-pages (depth first). */
export function readingOrder(pages: readonly Page[]): Page[] {
  const children = new Map<string | null, Page[]>()
  for (const p of pages) {
    const list = children.get(p.parentId) ?? []
    list.push(p)
    children.set(p.parentId, list)
  }
  const out: Page[] = []
  const walk = (parent: string | null) => {
    for (const p of children.get(parent) ?? []) {
      out.push(p)
      walk(p.id)
    }
  }
  walk(null)
  return out
}

/** The page after this one in its notebook (null at the end). */
export async function nextPageInNotebook(
  db: LearningNotesDB,
  pageId: string,
): Promise<Page | null> {
  const page = await db.pages.get(pageId)
  if (!page) return null
  const ordered = readingOrder(await listNotePages(db, page.notebookId))
  const at = ordered.findIndex((p) => p.id === pageId)
  return at >= 0 ? (ordered[at + 1] ?? null) : null
}
