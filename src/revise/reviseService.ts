import type { LearningNotesDB } from '../core/db'
import { descendantIds, isLive } from '../core/records'
import type { Page } from '../core/types'
import { marksOfBlock, type Mark } from './reviseMarks'

/**
 * Revise tab data: a notebook's lessons (top-level pages, not database
 * rows) with how many marks each has, a lesson's marks (its sub-pages
 * included) and its own summary text.
 */

export const MAX_SUMMARY_LENGTH = 20_000

export interface LessonMarks {
  lesson: Page
  marks: Mark[]
}

/** Live top-level lessons of a notebook with every mark on them and their sub-pages. */
export async function listLessonMarks(
  db: LearningNotesDB,
  notebookId: string,
): Promise<LessonMarks[]> {
  const pages = (
    await db.pages.where('notebookId').equals(notebookId).toArray()
  ).filter(isLive)
  const lessons = pages
    .filter((p) => p.parentId === null && !p.databaseId)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
  const lessonOf = new Map<string, Page>()
  for (const lesson of lessons) {
    lessonOf.set(lesson.id, lesson)
    for (const id of descendantIds(pages, lesson.id)) lessonOf.set(id, lesson)
  }
  const result = new Map<string, Mark[]>(lessons.map((l) => [l.id, []]))
  const blocks = await db.blocks
    .where('pageId')
    .anyOf([...lessonOf.keys()])
    .filter((b) => b.deletedAt === null)
    .toArray()
  for (const block of blocks) {
    const lesson = lessonOf.get(block.pageId)
    if (!lesson) continue
    result.get(lesson.id)!.push(...marksOfBlock(block))
  }
  return lessons.map((lesson) => ({ lesson, marks: result.get(lesson.id)! }))
}

/** Saves a lesson's own summary (empty text removes it). */
export async function setLessonSummary(
  db: LearningNotesDB,
  lessonId: string,
  text: string,
): Promise<void> {
  const summary = text.slice(0, MAX_SUMMARY_LENGTH)
  await db.transaction('rw', db.pages, async () => {
    const page = await db.pages.get(lessonId)
    if (!page || !isLive(page)) throw new Error('Not a lesson')
    await db.pages.update(lessonId, {
      summary: summary.trim() === '' ? undefined : summary,
      updatedAt: Date.now(),
    })
  })
}
