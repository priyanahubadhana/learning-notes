import { LearningNotesDB } from './db'
import { createId } from './ids'

/** Creates an isolated in-memory database for a test (uses fake-indexeddb). */
export function createTestDb(): LearningNotesDB {
  return new LearningNotesDB(`test-${createId()}`)
}
