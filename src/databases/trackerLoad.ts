import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import type { Page } from '../core/types'
import { reviewable } from '../recall/reviewService'
import { addCard, noStats, type LessonStats } from './trackerStats'

/**
 * Numbers for every lesson of a notebook, by lesson (top-level page) id.
 * Cards of sub-pages count towards their lesson; cards on pages that are
 * in the Trash, on database row pages, or not reviewable are left out.
 */
export async function loadTrackerStats(
  db: LearningNotesDB,
  notebookId: string,
  now: number = Date.now(),
): Promise<Map<string, LessonStats>> {
  const pages = await db.pages.where('notebookId').equals(notebookId).toArray()
  const byId = new Map<string, Page>(pages.map((p) => [p.id, p]))
  // Lesson of each page (cached while walking up the tree).
  const lessonOf = new Map<string, string | null>()
  const find = (page: Page): string | null => {
    const known = lessonOf.get(page.id)
    if (known !== undefined) return known
    let result: string | null = null
    if (isLive(page) && !page.databaseId) {
      if (page.parentId === null) result = page.id
      else {
        const parent = byId.get(page.parentId)
        result = parent ? find(parent) : null
      }
    }
    lessonOf.set(page.id, result)
    return result
  }

  const result = new Map<string, LessonStats>()
  for (const page of pages) {
    if (page.parentId === null && find(page)) result.set(page.id, noStats())
  }
  const cards = await reviewable(
    db,
    await db.cards.where('notebookId').equals(notebookId).toArray(),
  )
  for (const card of cards) {
    const page = byId.get(card.pageId)
    const lesson = page ? find(page) : null
    const stats = lesson ? result.get(lesson) : undefined
    if (stats) addCard(stats, card, now)
  }
  return result
}
