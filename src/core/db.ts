import Dexie, { type EntityTable, type Transaction } from 'dexie'
import { t, type MessageKey } from '../i18n/t'
import { searchIndexMiddleware } from '../search/indexMiddleware'
import { installRowCapture } from './rowCapture'
import { syncOutboxMiddleware } from '../sync/outbox'
import type {
  DayPlan,
  Habit,
  HabitCheck,
  HomeFile,
  Project,
  Task,
  TimeEntry,
} from './homeTypes'
import type { InkChunk, InkLayer } from './inkTypes'
import { orderBetween } from './order'
import { newRecordFields } from './records'
import type {
  Annotation,
  Block,
  BlockTag,
  BookFile,
  Card,
  Database,
  DbColumn,
  DbView,
  LayerInstall,
  SummaryItem,
  LinkRef,
  MetaValue,
  Notebook,
  Page,
  ReviewLog,
  PageVersion,
  Deck,
  StoredFont,
  StoredImage,
  Recording,
  RowRef,
  SavedSearch,
  SearchEntry,
  SecretRecord,
  SettingValue,
  SyncState,
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
  pageVersions!: EntityTable<PageVersion, 'id'>
  images!: EntityTable<StoredImage, 'id'>
  fonts!: EntityTable<StoredFont, 'id'>
  decks!: EntityTable<Deck, 'id'>
  layerInstalls!: EntityTable<LayerInstall, 'id'>
  summaryItems!: EntityTable<SummaryItem, 'id'>
  inkLayers!: EntityTable<InkLayer, 'id'>
  inkChunks!: EntityTable<InkChunk, 'id'>
  recordings!: EntityTable<Recording, 'id'>
  bookFiles!: EntityTable<BookFile, 'id'>
  annotations!: EntityTable<Annotation, 'id'>
  syncState!: EntityTable<SyncState, 'id'>
  tasks!: EntityTable<Task, 'id'>
  projects!: EntityTable<Project, 'id'>
  timeEntries!: EntityTable<TimeEntry, 'id'>
  dayPlans!: EntityTable<DayPlan, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitChecks!: EntityTable<HabitCheck, 'id'>
  files!: EntityTable<HomeFile, 'id'>
  secrets!: EntityTable<SecretRecord, 'id'>

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

    // Version 11 (Phase 6): saved copies of pages (history). Only adds a table.
    this.version(11).stores({ pageVersions: 'id, pageId, createdAt' })

    // Version 12 (Phase 6): pictures chosen from the device. Only adds a table.
    this.version(12).stores({ images: 'id' })

    // Version 13 (redesign step 3): ink. Only adds two tables, so older data
    // needs no change and older backup files stay valid. Chunks are indexed
    // by page (and layer), so a page reads only its own ink.
    this.version(13).stores({
      inkLayers: 'id, pageId',
      inkChunks: 'id, pageId, layerId',
    })

    // Version 14 (audio): voice recordings made while taking notes. Only adds
    // a table, so older data needs no change and older backup files stay valid.
    this.version(14).stores({ recordings: 'id, pageId' })

    // Version 15 (H1): fonts the user imported. Only adds a table.
    this.version(15).stores({ fonts: 'id' })

    // Version 16 (E1): decks (live filters over cards). Only adds a table.
    this.version(16).stores({ decks: 'id' })

    // Version 17 (C1): book files and annotations (highlights, notes,
    // bookmarks). Only adds two tables, so older data needs no change.
    this.version(17).stores({
      bookFiles: 'id, pageId',
      annotations: 'id, pageId, [pageId+kind], updatedAt',
    })

    // Version 18 (Sync L6): the sync fields of every synced record (clock,
    // server revision, "changed here" flag, Drive pointer), one row per
    // record, so no existing table changes. Only adds a table.
    this.version(18).stores({ syncState: 'id, dirty, fileState' })

    // Version 19 (Phase F, Home cockpit): tasks, projects, time entries,
    // day plans, habits, habit checks and Home recordings. Only adds tables.
    this.version(19).stores({
      tasks:
        'id, status, quadrant, plannedDay, doneDay, top3Day, projectId, sourceBlockId',
      projects: 'id',
      timeEntries: 'id, startedAt, day, projectId',
      dayPlans: 'id, day',
      habits: 'id',
      habitChecks: 'id, habitId, day, [habitId+day]',
      files: 'id, kind',
    })

    // Version 20 (Phase I, Layer gallery): layers that were added, with what
    // each one made. Only adds a table.
    this.version(20).stores({ layerInstalls: 'id, packId' })

    // Version 21 (Phase M, Summary tab): the lines of each page's Summary.
    // Only adds a table.
    this.version(21).stores({
      summaryItems: 'id, pageId, notebookId, sourceBlockId',
    })

    // Version 22 (R6-2, AI keys on all devices): device secrets the person
    // chose to sync, encrypted like any record; never in a backup file.
    // Only adds a table.
    this.version(22).stores({ secrets: 'id' })

    // Every save of a page or block also updates its search entry, in the
    // same transaction (see search/indexMiddleware.ts).
    this.use(searchIndexMiddleware)
    // Every save of a synced table marks it for sync (sync/outbox.ts).
    this.use(syncOutboxMiddleware)
    // Writes that are actions become Undo steps (core/rowCapture.ts).
    installRowCapture(this)
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
