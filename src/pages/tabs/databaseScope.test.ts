import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addBlocks } from '../../core/blockBulk'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { createDatabase } from '../../databases/databaseService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage } from '../pageService'
import { pageIdsOf, scopedDatabaseIds } from './databaseScope'

let db: LearningNotesDB
afterEach(async () => {
  await db.delete()
})
beforeEach(() => {
  db = createTestDb()
})

describe('Database tab scope', () => {
  it('finds sub-pages', () => {
    const pages = [
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'z', parentId: null },
    ]
    expect(pageIdsOf(pages, 'a', false)).toEqual(['a'])
    expect(pageIdsOf(pages, 'a', true)).toEqual(['a', 'b', 'c'])
  })

  it('widens from this page to sub-pages to the notebook', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = await createNotebook(db, ws, 'N')
    const top = await createPage(db, nb.id, null, 'Top')
    const sub = await createPage(db, nb.id, top.id, 'Sub')
    const d1 = await createDatabase(db, ws, nb.id, 'D1')
    const d2 = await createDatabase(db, ws, nb.id, 'D2')
    const d3 = await createDatabase(db, ws, nb.id, 'D3')
    await addBlocks(db, top.id, [
      { type: 'database', content: { databaseId: d1.id } },
    ])
    await addBlocks(db, sub.id, [
      { type: 'database', content: { databaseId: d2.id } },
    ])
    expect(await scopedDatabaseIds(db, ws, top, 'page')).toEqual([d1.id])
    expect((await scopedDatabaseIds(db, ws, top, 'sub')).sort()).toEqual(
      [d1.id, d2.id].sort(),
    )
    expect((await scopedDatabaseIds(db, ws, top, 'notebook')).sort()).toEqual(
      [d1.id, d2.id, d3.id].sort(),
    )
  })
})
