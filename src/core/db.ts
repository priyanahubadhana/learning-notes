import Dexie, { type EntityTable } from 'dexie'
import type { Block, Notebook, Page, Workspace } from './types'

/** Default IndexedDB database name used by the app. */
export const DEFAULT_DB_NAME = 'learning-notes'

/**
 * Local database (IndexedDB via Dexie).
 *
 * Only the fields listed in each schema string are indexed (searchable);
 * all other fields are still stored. Note: IndexedDB cannot index `null`,
 * so top-level pages/blocks (parentId = null) are found by filtering on
 * notebookId/pageId instead of by parentId.
 */
export class LearningNotesDB extends Dexie {
  workspaces!: EntityTable<Workspace, 'id'>
  notebooks!: EntityTable<Notebook, 'id'>
  pages!: EntityTable<Page, 'id'>
  blocks!: EntityTable<Block, 'id'>

  /** @param name Database name; tests pass a unique name to stay isolated. */
  constructor(name: string = DEFAULT_DB_NAME) {
    super(name)

    // Version 1 schema. Future changes must add a new version, never edit this.
    this.version(1).stores({
      workspaces: 'id',
      notebooks: 'id, workspaceId',
      pages: 'id, notebookId, parentId',
      blocks: 'id, pageId, parentId',
    })
  }
}

/** Shared database instance for the app. */
export const db = new LearningNotesDB()
