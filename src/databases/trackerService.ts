import type { LearningNotesDB } from '../core/db'
import { getLive } from '../core/records'
import type { JsonObject } from '../core/types'
import { listColumns } from './databaseService'
import { studyTrackerId } from './notebookTabs'
import { type LessonStatus } from './trackerStats'

/**
 * Study tracker Status set by the user (📌). The choice is stored in the
 * lesson page's `values` under the Status column's id; clearing it hands
 * the Status back to Auto.
 */

/** Sets a lesson's Status (null = back to Auto). */
export async function setLessonStatus(
  db: LearningNotesDB,
  lessonId: string,
  status: LessonStatus | null,
): Promise<void> {
  await db.transaction(
    'rw',
    [db.pages, db.databases, db.dbColumns],
    async () => {
      const page = await getLive(db.pages, lessonId)
      if (page.parentId !== null || page.databaseId) {
        throw new Error('Not a lesson')
      }
      const columns = await listColumns(db, studyTrackerId(page.notebookId))
      const column = columns.find((c) => c.type === 'trackerStatus')
      if (!column) throw new Error('This notebook has no Study tracker yet')
      const values: JsonObject = { ...page.values }
      if (status === null) delete values[column.id]
      else values[column.id] = status
      await db.pages.update(lessonId, {
        values: Object.keys(values).length > 0 ? values : undefined,
        updatedAt: Date.now(),
      })
    },
  )
}
