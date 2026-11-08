import type { LearningNotesDB } from '../core/db'

/**
 * AI and locked pages (R8-6). A locked page (or a page of a locked notebook)
 * is never read or sent by AI unless its notebook has "Allow AI while
 * locked". Checked inside `callAi`, so no screen can skip it.
 */
export async function aiLockedBlock(
  db: LearningNotesDB,
  pageId: string,
): Promise<boolean> {
  const page = await db.pages.get(pageId)
  if (!page) return false
  const notebook = await db.notebooks.get(page.notebookId)
  if (!page.locked && !notebook?.locked) return false
  return !notebook?.allowAiLocked
}
