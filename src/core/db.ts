import Dexie, { type EntityTable } from 'dexie'
import type {
  Block,
  BlockTag,
  Card,
  LinkRef,
  MetaValue,
  Notebook,
  Page,
  ReviewLog,
  SavedSearch,
  SearchEntry,
  SettingValue,
  Tag,
  Workspace,
} from './types'

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
  cards!: EntityTable<Card, 'id'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  settings!: EntityTable<SettingValue, 'id'>
  tags!: EntityTable<Tag, 'id'>
  savedSearches!: EntityTable<SavedSearch, 'id'>
  searchEntries!: EntityTable<SearchEntry, 'id'>
  links!: EntityTable<LinkRef, 'id'>
  blockTags!: EntityTable<BlockTag, 'id'>
  meta!: EntityTable<MetaValue, 'id'>

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

    // Version 2 (Phase 3): recall cards, review history, synced settings.
    // Only adds tables; existing records need no changes (new Block fields
    // `source` and `derivedFrom` are optional). `due` is indexed so the
    // review queue reads only due cards, even with tens of thousands.
    this.version(2).stores({
      cards: 'id, blockId, pageId, notebookId, due',
      reviewLogs: 'id, cardId, createdAt',
      settings: 'id',
    })

    // Version 3 (Phase 4): search, links, tags. Adds tables and one page
    // index; existing records need no changes (`Page.tagIds` is optional).
    // `*` marks a multi-entry index: one key per array item, so "pages with
    // tag X" and "entries with a word starting with …" are index lookups.
    // searchEntries/links/blockTags are rebuildable helper lists (see
    // types.ts); the search index is filled after the upgrade, in chunks,
    // by the search service (Step 2), not here.
    this.version(3).stores({
      pages: 'id, notebookId, parentId, *tagIds',
      tags: 'id, parentId',
      savedSearches: 'id',
      searchEntries: 'id, pageId, notebookId, *words',
      links: 'id, fromBlockId, fromPageId, toPageId, toBlockId',
      blockTags: 'id, blockId, pageId, tagId',
      meta: 'id',
    })
  }
}

/** Shared database instance for the app. */
export const db = new LearningNotesDB()
