import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { LearningNotesDB } from './db'
import { defaultNotebookTabs, studyTrackerId } from '../databases/notebookTabs'
import { createId } from './ids'
import type { Notebook } from './types'

/**
 * Upgrade tests: a database saved by an older version (Phase 1–2 = schema
 * version 1, Phase 3 = version 2, Phase 4 = version 3) must open in the current version with
 * every record intact.
 */
const T = 1_700_000_000_000
const base = { createdAt: T, updatedAt: T, deletedAt: null }
const CURRENT_VERSION = 13
let name = ''

afterEach(async () => {
  await Dexie.delete(name)
})

// Exact copies of the old schemas, as shipped.
const V1 = {
  workspaces: 'id',
  notebooks: 'id, workspaceId',
  pages: 'id, notebookId, parentId',
  blocks: 'id, pageId, parentId',
}
const V2 = {
  cards: 'id, blockId, pageId, notebookId, due',
  reviewLogs: 'id, cardId, createdAt',
  settings: 'id',
}
const V3 = {
  pages: 'id, notebookId, parentId, *tagIds',
  tags: 'id, parentId',
  savedSearches: 'id',
  searchEntries: 'id, pageId, notebookId, *words',
  links: 'id, fromBlockId, fromPageId, toPageId, toBlockId',
  blockTags: 'id, blockId, pageId, tagId',
  meta: 'id',
}

const V4 = {
  pages: 'id, notebookId, parentId, *tagIds, databaseId',
  databases: 'id, workspaceId, notebookId',
  dbColumns: 'id, databaseId',
  dbViews: 'id, databaseId, blockId',
  rowRefs: 'id, fromPageId, toPageId, columnId',
}

const card = {
  ...base,
  id: 'c1',
  blockId: 'b1',
  part: 'main',
  pageId: 'p1',
  notebookId: 'nb1',
  due: T,
  intervalDays: 0,
  step: 0,
  reps: 0,
  lapses: 0,
  suspendedAt: null,
}

/** Adds the Phase 1–2 sample data (workspace, notebook, page, 2 blocks). */
async function addVersion1Data(old: Dexie) {
  await old.table('workspaces').add({ ...base, id: 'w1', name: 'Me' })
  await old.table('notebooks').add({
    ...base,
    id: 'nb1',
    workspaceId: 'w1',
    title: 'Biology',
    order: 'a0',
  })
  await old.table('pages').add({
    ...base,
    id: 'p1',
    notebookId: 'nb1',
    parentId: null,
    title: 'Cells',
    order: 'a0',
  })
  const block = { ...base, pageId: 'p1', type: 'paragraph', order: 'a0' }
  await old.table('blocks').bulkAdd([
    { ...block, id: 'b1', parentId: null, content: { text: 'Mitochondria' } },
    {
      ...block,
      id: 'b2',
      parentId: 'b1',
      content: { text: 'Nested' },
      deletedAt: T,
    },
  ])
}

async function createVersion1Db(dbName: string) {
  const old = new Dexie(dbName)
  old.version(1).stores(V1)
  await addVersion1Data(old)
  old.close()
}

async function createVersion2Db(dbName: string) {
  const old = new Dexie(dbName)
  old.version(1).stores(V1)
  old.version(2).stores(V2)
  await addVersion1Data(old)
  await old.table('cards').add({
    ...card,
    intervalDays: 3,
    reps: 2,
    schedulerData: { scheduler: 'fsrs', stability: 4.2 },
  })
  await old.table('reviewLogs').add({
    id: 'r1',
    cardId: 'c1',
    rating: 'good',
    createdAt: T,
    durationMs: 1200,
    kind: 'review',
    scheduler: 'fsrs',
    dueBefore: T,
    dueAfter: T + 3 * 86_400_000,
    intervalBefore: 0,
    intervalAfter: 3,
    stepAfter: 1,
    isNew: true,
  })
  await old
    .table('settings')
    .put({ id: 'review.newPerDay', value: 15, updatedAt: T })
  old.close()
}

/**
 * Phase 4 database: version 1 data plus a tagged page, a tag, search and
 * link rows, and the special Journal and Templates notebooks.
 */
async function createVersion3Db(dbName: string) {
  const old = new Dexie(dbName)
  old.version(1).stores(V1)
  old.version(2).stores(V2)
  old.version(3).stores(V3)
  await addVersion1Data(old)
  await old.table('notebooks').bulkAdd([
    {
      ...base,
      id: 'nbJ',
      workspaceId: 'w1',
      title: 'Journal',
      order: 'a1',
      kind: 'journal',
    },
    {
      ...base,
      id: 'nbT',
      workspaceId: 'w1',
      title: 'Templates',
      order: 'a2',
      kind: 'templates',
      starterVersion: 2,
    },
  ])
  await old
    .table('tags')
    .add({ ...base, id: 't1', name: 'medicine', parentId: null })
  await old.table('pages').update('p1', { tagIds: ['t1'] })
  await old.table('searchEntries').add({
    id: 'title:p1',
    kind: 'title',
    pageId: 'p1',
    notebookId: 'nb1',
    words: ['cells'],
    updatedAt: T,
  })
  await old
    .table('links')
    .add({ id: 'b1|0', fromBlockId: 'b1', fromPageId: 'p1', toPageId: 'p9' })
  await old.table('meta').put({ id: 'searchIndexVersion', value: 4 })
  old.close()
}

/** The default tabs the upgrade gives an existing normal notebook. */
function expectDefaultTabs(notebook: Notebook | undefined) {
  expect(notebook?.tabs).toEqual(defaultNotebookTabs(notebook!.id))
  expect(notebook?.tabs?.map((t) => t.kind)).toEqual([
    'notes',
    'database',
    'cards',
    'revise',
  ])
}

/** Checks the Phase 5 tables and indexes work straight away. */
async function expectVersion4TablesWork(db: LearningNotesDB) {
  const databaseId = studyTrackerId('nb1')
  await db.databases.add({
    ...base,
    id: databaseId,
    workspaceId: 'w1',
    notebookId: 'nb1',
    title: 'Study tracker',
    order: 'a0',
    kind: 'studyTracker',
  })
  await db.dbColumns.add({
    ...base,
    id: 'col1',
    databaseId,
    name: 'Confidence',
    type: 'number',
    config: { format: 'stars' },
    order: 'a0',
  })
  await db.dbViews.bulkAdd([
    {
      ...base,
      id: 'v1',
      databaseId,
      name: 'Table',
      type: 'table',
      config: {},
      order: 'a0',
    },
    {
      ...base,
      id: 'v2',
      databaseId,
      name: 'Table',
      type: 'table',
      config: {},
      order: 'a1',
      blockId: 'b1',
    },
  ])
  // A lesson keeps its own values; a row page is found by its database.
  await db.pages.update('p1', { values: { col1: 4 } })
  await db.pages.add({
    ...base,
    id: 'row1',
    notebookId: 'nb1',
    parentId: null,
    title: 'Aspirin',
    order: 'a1',
    databaseId: 'db2',
    values: { col9: 'NSAID' },
  })
  expect(await db.databases.where('notebookId').equals('nb1').count()).toBe(1)
  expect(
    await db.dbColumns.where('databaseId').equals(databaseId).count(),
  ).toBe(1)
  expect(await db.dbViews.where('blockId').equals('b1').primaryKeys()).toEqual([
    'v2',
  ])
  expect(
    await db.pages.where('databaseId').equals('db2').primaryKeys(),
  ).toEqual(['row1'])
  expect((await db.pages.get('p1'))?.values).toEqual({ col1: 4 })
  // Old pages are not rows: no key in the new index.
  expect(await db.pages.where('databaseId').equals('').count()).toBe(0)

  await db.rowRefs.add({
    id: 'row1|col2|p1',
    fromPageId: 'row1',
    columnId: 'col2',
    toPageId: 'p1',
  })
  expect(await db.rowRefs.where('toPageId').equals('p1').count()).toBe(1)
}

/** Checks the Phase 1–2 sample data survived. */
async function expectVersion1Data(db: LearningNotesDB) {
  expect(await db.workspaces.get('w1')).toMatchObject({ name: 'Me' })
  expect(await db.notebooks.get('nb1')).toMatchObject({ title: 'Biology' })
  expect(await db.pages.get('p1')).toMatchObject({ title: 'Cells' })
  const blocks = await db.blocks.where('pageId').equals('p1').sortBy('id')
  expect(blocks).toHaveLength(2)
  expect(blocks[0].content).toEqual({ text: 'Mitochondria' })
  expect(blocks[1]).toMatchObject({ parentId: 'b1', deletedAt: T })
}

/** Checks the Phase 4 tables and indexes work straight away. */
async function expectVersion3TablesWork(db: LearningNotesDB) {
  // Old pages (no tagIds) still list by notebook; tagged pages by tag.
  await db.tags.bulkAdd([
    { ...base, id: 't1', name: 'medicine', parentId: null },
    { ...base, id: 't2', name: 'cardio', parentId: 't1', color: '#d9822b' },
  ])
  await db.pages.update('p1', { tagIds: ['t1', 't2'] })
  expect(await db.pages.where('notebookId').equals('nb1').count()).toBe(1)
  expect(await db.pages.where('tagIds').equals('t2').primaryKeys()).toEqual([
    'p1',
  ])
  expect(await db.tags.where('parentId').equals('t1').count()).toBe(1)

  // Word index: prefix lookups through the multi-entry index.
  const entry = { pageId: 'p1', notebookId: 'nb1' }
  // bulkPut: saving the page above already indexed its title.
  await db.searchEntries.bulkPut([
    { ...entry, id: 'title:p1', kind: 'title', words: ['cells'], updatedAt: T },
    {
      ...entry,
      id: 'b1',
      kind: 'text',
      blockId: 'b1',
      words: ['mitochondria', 'mitral'],
      updatedAt: T,
    },
  ])
  const hits = await db.searchEntries.where('words').startsWith('mit').toArray()
  // An entry matching two words can come back once per word; callers dedupe.
  expect(new Set(hits.map((e) => e.id))).toEqual(new Set(['b1']))

  await db.links.add({
    id: 'b1|0',
    fromBlockId: 'b1',
    fromPageId: 'p1',
    toPageId: 'p2',
    toBlockId: 'b9',
  })
  expect(await db.links.where('toPageId').equals('p2').count()).toBe(1)
  await db.blockTags.add({
    id: 'b1|t1',
    blockId: 'b1',
    pageId: 'p1',
    tagId: 't1',
  })
  expect(await db.blockTags.where('tagId').equals('t1').count()).toBe(1)
  await db.savedSearches.add({
    ...base,
    id: 's1',
    name: 'Due cardio',
    query: { text: 'cardio' },
    order: 'a0',
  })
  await db.meta.put({ id: 'searchIndexVersion', value: 1 })
  expect(await db.meta.get('searchIndexVersion')).toMatchObject({ value: 1 })
}

describe('database upgrade', () => {
  it('from version 1 keeps all Phase 1–2 data and adds the new tables', async () => {
    name = `migrate-${createId()}`
    await createVersion1Db(name)

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    await expectVersion1Data(db)

    // Phase 3 tables work straight away.
    await db.cards.add(card)
    await db.settings.put({ id: 'review.newPerDay', value: 20, updatedAt: T })
    expect(await db.cards.where('due').belowOrEqual(T).count()).toBe(1)
    expect(await db.reviewLogs.count()).toBe(0)

    await expectVersion3TablesWork(db)
    expectDefaultTabs(await db.notebooks.get('nb1'))
    await expectVersion4TablesWork(db)
    db.close()
  })

  it('from version 2 keeps all Phase 3 data (cards, review log, settings)', async () => {
    name = `migrate-${createId()}`
    await createVersion2Db(name)

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    await expectVersion1Data(db)

    expect(await db.cards.get('c1')).toMatchObject({
      intervalDays: 3,
      reps: 2,
      schedulerData: { scheduler: 'fsrs', stability: 4.2 },
    })
    expect(await db.cards.where('due').belowOrEqual(T).count()).toBe(1)
    expect(await db.reviewLogs.where('cardId').equals('c1').toArray()).toEqual([
      expect.objectContaining({ id: 'r1', rating: 'good', isNew: true }),
    ])
    expect(await db.settings.get('review.newPerDay')).toMatchObject({
      value: 15,
    })

    // Old pages have no tags; the new index simply has no keys for them.
    expect((await db.pages.get('p1'))?.tagIds).toBeUndefined()
    expect(await db.pages.where('tagIds').equals('t1').count()).toBe(0)

    await expectVersion3TablesWork(db)
    expectDefaultTabs(await db.notebooks.get('nb1'))
    await expectVersion4TablesWork(db)
    db.close()
  })

  it('from version 3 keeps all Phase 4 data and gives normal notebooks tabs', async () => {
    name = `migrate-${createId()}`
    await createVersion3Db(name)

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    await expectVersion1Data(db)

    // Phase 4 data intact; the new page index finds tagged pages as before.
    expect(await db.pages.where('tagIds').equals('t1').primaryKeys()).toEqual([
      'p1',
    ])
    expect(await db.tags.get('t1')).toMatchObject({ name: 'medicine' })
    expect(await db.searchEntries.where('words').equals('cells').count()).toBe(
      1,
    )
    expect(await db.links.where('toPageId').equals('p9').count()).toBe(1)
    expect(await db.meta.get('searchIndexVersion')).toMatchObject({ value: 4 })

    // Normal notebook: default tabs. Journal and Templates: none, unchanged.
    expectDefaultTabs(await db.notebooks.get('nb1'))
    expect((await db.notebooks.get('nbJ'))?.tabs).toBeUndefined()
    expect(await db.notebooks.get('nbT')).toMatchObject({ starterVersion: 2 })
    expect((await db.notebooks.get('nbT'))?.tabs).toBeUndefined()

    await expectVersion4TablesWork(db)
    db.close()
  })

  it('from version 4 gives every database a Dashboard and a Board view after its others', async () => {
    name = `migrate-${createId()}`
    const old = new Dexie(name)
    old.version(1).stores(V1)
    old.version(2).stores(V2)
    old.version(3).stores(V3)
    old.version(4).stores(V4)
    await addVersion1Data(old)
    const database = { ...base, workspaceId: 'w1', order: 'a0' }
    await old.table('databases').bulkAdd([
      { ...database, id: 'db1', notebookId: 'nb1', title: 'Drugs' },
      { ...database, id: 'db2', notebookId: null, title: 'Has one' },
    ])
    const view = {
      ...base,
      config: { sorts: [] },
      name: 'Table',
      type: 'table',
    }
    await old.table('dbViews').bulkAdd([
      { ...view, id: 'v1', databaseId: 'db1', order: 'a0' },
      { ...view, id: 'v2', databaseId: 'db1', order: 'a1', blockId: 'b1' },
      {
        ...view,
        id: 'v3',
        databaseId: 'db2',
        order: 'a0',
        type: 'dashboard',
        name: 'Mine',
      },
    ])
    old.close()

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    await expectVersion1Data(db)
    const views = await db.dbViews.where('databaseId').equals('db1').toArray()
    expect(views).toHaveLength(4)
    const dashboard = views.find((v) => v.type === 'dashboard')!
    expect(dashboard).toMatchObject({
      name: 'Dashboard',
      config: {},
      deletedAt: null,
    })
    expect(dashboard.blockId).toBeUndefined()
    expect(dashboard.order > 'a0').toBe(true)
    expect(await db.dbViews.get('v1')).toMatchObject({ config: { sorts: [] } })
    const board = views.find((v) => v.type === 'board')!
    expect(board).toMatchObject({ name: 'Board', config: {} })
    expect(board.order > dashboard.order).toBe(true)
    // A database that already has a dashboard gets no second one.
    const db2 = await db.dbViews.where('databaseId').equals('db2').toArray()
    expect(db2.map((v) => v.type).sort()).toEqual(['board', 'dashboard'])
    db.close()
  })

  it('from version 6 repairs view names saved as raw text keys', async () => {
    name = `migrate-${createId()}`
    const old = new Dexie(name)
    old.version(1).stores(V1)
    old.version(2).stores(V2)
    old.version(3).stores(V3)
    old.version(4).stores(V4)
    old.version(5).stores({})
    old.version(6).stores({})
    await addVersion1Data(old)
    const view = { ...base, databaseId: 'db1', config: {}, order: 'a0' }
    await old.table('dbViews').bulkAdd([
      { ...view, id: 'v1', type: 'board', name: 'database.view.board' },
      { ...view, id: 'v2', type: 'board', name: 'My board' },
    ])
    old.close()

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    await expectVersion1Data(db)
    expect((await db.dbViews.get('v1'))?.name).toBe('Board')
    expect((await db.dbViews.get('v2'))?.name).toBe('My board')
    db.close()
  })

  it("from version 7 copies each card's newest answer onto it", async () => {
    name = `migrate-${createId()}`
    const old = new Dexie(name)
    old.version(1).stores(V1)
    old.version(2).stores(V2)
    old.version(3).stores(V3)
    old.version(4).stores(V4)
    for (const v of [5, 6, 7]) old.version(v).stores({})
    await addVersion1Data(old)
    await old.table('cards').bulkAdd([card, { ...card, id: 'c2' }])
    const log = {
      cardId: 'c1',
      durationMs: 1000,
      kind: 'review',
      scheduler: 'fixed',
      dueBefore: T,
      dueAfter: T,
      intervalBefore: 0,
      intervalAfter: 1,
      stepAfter: 1,
      isNew: false,
    }
    await old.table('reviewLogs').bulkAdd([
      { ...log, id: 'l1', rating: 'good', createdAt: T + 1 },
      { ...log, id: 'l2', rating: 'again', createdAt: T + 3, kind: 'cram' },
      { ...log, id: 'l3', rating: 'easy', createdAt: T + 2 },
      // Erased entries ("Delete forever") don't count.
      { ...log, id: 'l4', rating: 'easy', createdAt: T + 9, purgedAt: T },
    ])
    old.close()

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    await expectVersion1Data(db)
    expect(await db.cards.get('c1')).toMatchObject({
      due: T,
      lastReviewAt: T + 3,
      lastRating: 'again',
    })
    const untouched = await db.cards.get('c2')
    expect(untouched?.lastReviewAt).toBeUndefined()
    expect(untouched?.lastRating).toBeUndefined()
    db.close()
  })

  it('from version 8 adds the Card levels column to every Study tracker, once', async () => {
    name = `migrate-${createId()}`
    const old = new Dexie(name)
    old.version(1).stores(V1)
    old.version(2).stores(V2)
    old.version(3).stores(V3)
    old.version(4).stores(V4)
    for (const v of [5, 6, 7, 8]) old.version(v).stores({})
    await addVersion1Data(old)
    const tracker = (id: string, kind?: string) => ({
      ...base,
      id,
      workspaceId: 'w1',
      title: id,
      order: 'a0',
      ...(kind && { kind }),
    })
    await old
      .table('databases')
      .bulkAdd([tracker('t1', 'studyTracker'), tracker('plain')])
    const column = (
      id: string,
      databaseId: string,
      type: string,
      order: string,
    ) => ({
      ...base,
      id,
      databaseId,
      name: id,
      type,
      config: {},
      order,
    })
    await old
      .table('dbColumns')
      .bulkAdd([
        column('a', 't1', 'trackerStatus', 'a0'),
        column('b', 't1', 'number', 'a1'),
        column('p', 'plain', 'text', 'a0'),
      ])
    old.close()

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    const levels = await db.dbColumns
      .filter((c) => c.type === 'trackerLevels')
      .toArray()
    expect(levels).toHaveLength(1)
    expect(levels[0]).toMatchObject({ databaseId: 't1', name: 'Card levels' })
    expect(levels[0].order > 'a1').toBe(true) // after the other columns
    db.close()
  })

  it('from version 9 adds the Revise tab to notebooks that have tabs, once', async () => {
    name = `migrate-${createId()}`
    const old = new Dexie(name)
    old.version(1).stores(V1)
    old.version(2).stores(V2)
    old.version(3).stores(V3)
    old.version(4).stores(V4)
    for (const v of [5, 6, 7, 8, 9]) old.version(v).stores({})
    await addVersion1Data(old)
    await old.table('notebooks').bulkAdd([
      {
        ...base,
        id: 'a',
        workspaceId: 'w1',
        title: 'A',
        order: 'a0',
        tabs: [{ id: 'notes', kind: 'notes' }],
      },
      {
        ...base,
        id: 'b',
        workspaceId: 'w1',
        title: 'B',
        order: 'a1',
        tabs: [
          { id: 'notes', kind: 'notes' },
          { id: 'revise', kind: 'revise', title: 'Mine' },
        ],
      },
      {
        ...base,
        id: 'j',
        workspaceId: 'w1',
        title: 'J',
        order: 'a2',
        kind: 'journal',
      },
    ])
    old.close()

    const db = new LearningNotesDB(name)
    await db.open()
    expect((await db.notebooks.get('a'))?.tabs?.map((t) => t.kind)).toEqual([
      'notes',
      'revise',
    ])
    expect((await db.notebooks.get('b'))?.tabs).toHaveLength(2) // already had one
    expect((await db.notebooks.get('j'))?.tabs).toBeUndefined() // special notebook
    db.close()
  })

  it('from version 10 adds the page history table (empty)', async () => {
    name = `migrate-${createId()}`
    const old = new Dexie(name)
    old.version(1).stores(V1)
    old.version(2).stores(V2)
    old.version(3).stores(V3)
    old.version(4).stores(V4)
    for (const v of [5, 6, 7, 8, 9, 10]) old.version(v).stores({})
    await addVersion1Data(old)
    old.close()

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    expect(await db.pageVersions.count()).toBe(0)
    expect((await db.pages.toArray()).length).toBeGreaterThan(0) // data intact
    db.close()
  })

  it('from version 11 adds the pictures table (empty)', async () => {
    name = `migrate-${createId()}`
    const old = new Dexie(name)
    old.version(1).stores(V1)
    old.version(2).stores(V2)
    old.version(3).stores(V3)
    old.version(4).stores(V4)
    for (const v of [5, 6, 7, 8, 9, 10]) old.version(v).stores({})
    old.version(11).stores({ pageVersions: 'id, pageId, createdAt' })
    await addVersion1Data(old)
    old.close()

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(CURRENT_VERSION)
    expect(await db.images.count()).toBe(0)
    expect((await db.pages.toArray()).length).toBeGreaterThan(0)
    db.close()
  })
})
