import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import type { Database } from '../../core/types'
import { loadDatabaseData } from '../databaseQuery'

/**
 * A database loaded for a view, kept up to date as the data changes. A
 * Study tracker also reloads when `now` moves on (its "due" counts depend
 * on the time); other databases do not.
 */
export function useDatabaseData(
  db: LearningNotesDB,
  database: Database,
  now: number,
) {
  const tick = database.kind === 'studyTracker' ? now : 0
  return useLiveQuery(
    () => loadDatabaseData(db, database.id, tick || Date.now()),
    [db, database.id, tick],
  )
}
