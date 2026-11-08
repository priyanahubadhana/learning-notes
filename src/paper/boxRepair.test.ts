import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { repairBoxes } from './boxService'

let db: LearningNotesDB
let pageId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  const nb = await createNotebook(db, ws, 'N')
  pageId = (await createPage(db, nb.id)).id
})
afterEach(async () => {
  await db.delete()
})

const line = (boxId: string | undefined, text = '') =>
  createBlock(db, {
    pageId,
    type: 'paragraph',
    content: text ? { text: [{ type: 'text', text, styles: {} }] } : {},
  }).then((b) => (boxId ? db.blocks.update(b.id, { boxId }) : 0))

describe('repairBoxes', () => {
  it('removes an empty box sitting on the default box, keeps everything with content', async () => {
    await db.pages.update(pageId, {
      boxes: [
        { id: 'dup', x: 16, y: 10, w: 90 },
        { id: 'far', x: 100, y: 150, w: 90 },
        { id: 'full', x: 17, y: 11, w: 90 },
      ],
    })
    await line(undefined, 'Main text')
    await line('dup')
    await line('far')
    await line('full', 'Has words')
    expect(await repairBoxes(db, pageId)).toEqual(['dup'])
    const page = await db.pages.get(pageId)
    expect(page?.boxes?.map((b) => b.id)).toEqual(['far', 'full'])
    const blocks = await listBlocks(db, pageId)
    expect(blocks.map((b) => b.boxId)).toEqual([undefined, 'far', 'full'])
  })

  it('keeps one of two empty boxes on the same spot, and does nothing twice', async () => {
    await db.pages.update(pageId, {
      boxes: [
        { id: 'a', x: 100, y: 100, w: 50 },
        { id: 'b', x: 102, y: 103, w: 50 },
      ],
    })
    await line('a')
    await line('b')
    expect(await repairBoxes(db, pageId)).toEqual(['b'])
    expect(await repairBoxes(db, pageId)).toEqual([])
  })

  it('drops empty orphan lines when the page has text', async () => {
    await line(undefined, 'Main text')
    await line('gone')
    await repairBoxes(db, pageId)
    expect((await listBlocks(db, pageId)).length).toBe(1)
  })
})
