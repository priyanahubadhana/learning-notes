import Dexie, { type EntityTable, type Transaction } from 'dexie'
import { t, type MessageKey } from '../i18n/t'
import { searchIndexMiddleware } from '../search/indexMiddleware'
import { orderBetween } from './order'
import { newRecordFields } from './records'
import type {
  Block,
  BlockTag,
  Card,
  Database,
  DbColumn,
  DbView,
  LinkRef,
  MetaValue,
  Notebook,
  Page,
  ReviewLog,
  RowRef,
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
  databases!: EntityTable<Database, 'id'>
  dbColumns!: EntityTable<DbColumn, 'id'>
  dbViews!: EntityTable<DbView, 'id'>
  rowRefs!: EntityTable<RowRef, 'id'>

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

    // Version 4 (Phase 5): databases. Rows are pages (`databaseId`, cell
    // `values`), so notes, cards, links and tags work inside rows. The
    // Study tracker database itself is made when first needed (Step 2), at
    // the id the Database tab already points to. rowRefs is a rebuildable
    // helper list (Relation values, for "rows pointing here").
    this.version(4)
      .stores({
        pages: 'id, notebookId, parentId, *tagIds, databaseId',
        databases: 'id, workspaceId, notebookId',
        dbColumns: 'id, databaseId',
        dbViews: 'id, databaseId, blockId',
        rowRefs: 'id, fromPageId, toPageId, columnId',
      })
      .upgrade(async (tx) => {
        // Existing normal notebooks get the default tabs. Frozen copy of
        // defaultNotebookTabs() as of version 4: later template changes
        // must not change what this upgrade wrote.
        await tx
          .table<Notebook, string>('notebooks')
          .toCollection()
          .modify((notebook) => {
            if (notebook.kind || notebook.tabs) return
            notebook.tabs = [
              { id: 'notes', kind: 'notes' },
              {
                id: 'database',
                kind: 'database',
                databaseId: `tracker:${notebook.id}`,
              },
              { id: 'cards', kind: 'cards' },
            ]
          })
      })

    // Version 5 (Phase 5 Step 4): every database gets a Dashboard view
    // (after its other views), like new databases do. No schema change.
    this.version(5)
      .stores({})
      .upgrade((tx) => addViewToEveryDatabase(tx, 'dashboard'))

    // Version 6 (Phase 5 Step 5): the same for the Board view.
    this.version(6)
      .stores({})
      .upgrade((tx) => addViewToEveryDatabase(tx, 'board'))

    // Version 7: repair. A view named by an upgrade while the app's text
    // file was not loaded yet kept the raw key ("database.view.board");
    // give such views their real name. No schema change.
    this.version(7)
      .stores({})
      .upgrade((tx) =>
        tx
          .table<DbView, string>('dbViews')
          .toCollection()
          .modify((view) => {
            if (/^database\.view\.\w+$/.test(view.name)) {
              view.name = t(view.name as MessageKey)
            }
          }),
      )

    // Version 8 (Phase 5 Step 6): every card gets `lastReviewAt` and
    // `lastRating` from its newest review log entry, so the Study tracker
    // reads cards only. No schema change (the fields are not indexed).
    this.version(8)
      .stores({})
      .upgrade(async (tx) => {
        const newest = new Map<string, ReviewLog>()
        await tx.table<ReviewLog, string>('reviewLogs').each((log) => {
          if (log.purgedAt !== undefined) return
          const known = newest.get(log.cardId)
          if (!known || log.createdAt > known.createdAt) {
            newest.set(log.cardId, log)
          }
        })
        await tx
          .table<Card, string>('cards')
          .toCollection()
          .modify((card) => {
            const log = newest.get(card.id)
            if (!log) return
            card.lastReviewAt = log.createdAt
            card.lastRating = log.rating
          })
      })

    // Version 9 (Phase 5 Step 6): every Study tracker gets the auto column
    // "Card levels" (the New · Learning · Familiar · Mastered breakdown).
    this.version(9)
      .stores({})
      .upgrade(async (tx) => {
        const trackers = await tx
          .table<Database, string>('databases')
          .filter((d) => d.kind === 'studyTracker')
          .toArray()
        const columns = await tx.table<DbColumn, string>('dbColumns').toArray()
        const added: DbColumn[] = []
        for (const tracker of trackers) {
          const own = columns.filter((c) => c.databaseId === tracker.id)
          if (own.some((c) => c.type === 'trackerLevels')) continue
          const last = own
            .map((c) => c.order)
            .sort()
            .at(-1)
          added.push({
            ...newRecordFields(),
            databaseId: tracker.id,
            name: t('tracker.column.levels'),
            type: 'trackerLevels',
            config: {},
            order: orderBetween(last ?? null, null),
          })
        }
        await tx.table<DbColumn, string>('dbColumns').bulkAdd(added)
      })

    // Version 10 (Phase 5B): every normal notebook gets the Revise tab,
    // after its other tabs (unless it already has one).
    this.version(10)
      .stores({})
      .upgrade((tx) =>
        tx
          .table<Notebook, string>('notebooks')
          .toCollection()
          .modify((notebook) => {
            if (
              !notebook.tabs ||
              notebook.tabs.some((t) => t.kind === 'revise')
            )
              return
            notebook.tabs = [...notebook.tabs, { id: 'revise', kind: 'revise' }]
          }),
      )

    // Every save of a page or block also updates its search entry, in the
    // same transaction (see search/indexMiddleware.ts).
    this.use(searchIndexMiddleware)
  }
}

/**
 * Upgrade step: gives every database without a view of `type` one, after
 * its other own views ("/database" block views don't count).
 */
async function addViewToEveryDatabase(
  tx: Transaction,
  type: 'dashboard' | 'board',
): Promise<void> {
  const views = await tx.table<DbView, string>('dbViews').toArray()
  const databases = await tx.table<Database, string>('databases').toArray()
  const added: DbView[] = []
  for (const database of databases) {
    const own = views.filter(
      (v) => v.databaseId === database.id && v.blockId === undefined,
    )
    if (own.some((v) => v.type === type)) continue
    const last = own
      .map((v) => v.order)
      .sort()
      .at(-1)
    added.push({
      ...newRecordFields(),
      databaseId: database.id,
      name: t(`database.view.${type}`),
      type,
      config: {},
      order: orderBetween(last ?? null, null),
    })
  }
  await tx.table<DbView, string>('dbViews').bulkAdd(added)
}

/** Shared database instance for the app. */
export const db = new LearningNotesDB()
