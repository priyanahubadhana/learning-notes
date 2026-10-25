import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { LearningNotesDB } from './db'
import { createId } from './ids'

/**
 * Upgrade test: a database saved by Phase 1–2 (schema version 1) must open
 * in the current version with every record intact.
 */
const T = 1_700_000_000_000
const base = { createdAt: T, updatedAt: T, deletedAt: null }
let name = ''

afterEach(async () => {
  await Dexie.delete(name)
})

async function createVersion1Db(dbName: string) {
  const old = new Dexie(dbName)
  // Exact copy of the version 1 schema, as shipped in Phase 1–2.
  old.version(1).stores({
    workspaces: 'id',
    notebooks: 'id, workspaceId',
    pages: 'id, notebookId, parentId',
    blocks: 'id, pageId, parentId',
  })
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
  old.close()
}

describe('database upgrade from version 1', () => {
  it('keeps all Phase 1–2 data and adds the new tables', async () => {
    name = `migrate-${createId()}`
    await createVersion1Db(name)

    const db = new LearningNotesDB(name)
    await db.open()
    expect(db.verno).toBe(2)

    expect(await db.workspaces.get('w1')).toMatchObject({ name: 'Me' })
    expect(await db.notebooks.get('nb1')).toMatchObject({ title: 'Biology' })
    expect(await db.pages.get('p1')).toMatchObject({ title: 'Cells' })
    const blocks = await db.blocks.where('pageId').equals('p1').sortBy('id')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].content).toEqual({ text: 'Mitochondria' })
    expect(blocks[1]).toMatchObject({ parentId: 'b1', deletedAt: T })

    // The new tables work straight away.
    await db.cards.add({
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
    })
    await db.settings.put({ id: 'review.newPerDay', value: 20, updatedAt: T })
    expect(await db.cards.where('due').belowOrEqual(T).count()).toBe(1)
    expect(await db.reviewLogs.count()).toBe(0)
    db.close()
  })
})
