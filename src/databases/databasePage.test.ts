import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { getBlockView } from './blockViews'
import { makeDatabasePage } from './databasePage'

let db: LearningNotesDB
let nb: string

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Library')).id
})

afterEach(async () => {
  await db.delete()
})

describe('database page', () => {
  it('turns a blank page into a full-width database block with a line below', async () => {
    const page = await createPage(db, nb, null, '')
    const databaseId = await makeDatabasePage(db, page.id)
    expect(databaseId).toBeTruthy()
    const blocks = await listBlocks(db, page.id)
    expect(blocks.map((b) => b.type)).toEqual(['database', 'paragraph'])
    expect(blocks[0].content.databaseId).toBe(databaseId)
    const view = await getBlockView(db, databaseId!, blocks[0].id)
    expect(view?.config.fullWidth).toBe(true)
    // The page takes the database's name; the database is in this notebook.
    expect((await db.pages.get(page.id))?.title).not.toBe('')
    expect((await db.databases.get(databaseId!))?.notebookId).toBe(nb)
  })

  it('changes nothing on a page that already has writing', async () => {
    const page = await createPage(db, nb, null, 'Notes')
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: { text: plainText('hello') },
    })
    expect(await makeDatabasePage(db, page.id)).toBeNull()
    expect(await db.databases.count()).toBe(0)
  })
})
