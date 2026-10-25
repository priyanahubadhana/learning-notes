import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import {
  createBlock,
  deleteBlock,
  listBlocks,
  moveBlock,
  saveBlockChanges,
  updateBlock,
} from './blockService'
import type { LearningNotesDB } from './db'
import { createTestDb } from './testing'
import { getOrCreateDefaultWorkspace } from './workspaceService'

let db: LearningNotesDB
let pageId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id)
  pageId = (await createPage(db, nb.id)).id
})

afterEach(async () => {
  await db.delete()
})

/** Text of live blocks under a parent, in order. */
const texts = async (parentId: string | null) =>
  (await listBlocks(db, pageId))
    .filter((b) => b.parentId === parentId)
    .map((b) => b.content.text)

const add = (text: string, extra: { parentId?: string; index?: number } = {}) =>
  createBlock(db, { pageId, type: 'paragraph', content: { text }, ...extra })

describe('blockService', () => {
  it('creates blocks as separate records, appended or at an index', async () => {
    await add('one')
    await add('three')
    await add('two', { index: 1 })
    expect(await texts(null)).toEqual(['one', 'two', 'three'])
    expect(await db.blocks.count()).toBe(3)
  })

  it('accepts any block type string (pluggable types)', async () => {
    const b = await createBlock(db, {
      pageId,
      type: 'my-custom-type',
      content: { anything: [1, 2, { nested: true }] },
    })
    expect(await db.blocks.get(b.id)).toMatchObject({
      type: 'my-custom-type',
      content: { anything: [1, 2, { nested: true }] },
    })
  })

  it('rejects an unknown page or a parent from another page', async () => {
    await expect(
      createBlock(db, { pageId: 'nope', type: 'paragraph' }),
    ).rejects.toThrow('not found')

    const nb = (await db.pages.get(pageId))!.notebookId
    const otherPage = await createPage(db, nb)
    const foreign = await createBlock(db, {
      pageId: otherPage.id,
      type: 'paragraph',
    })
    await expect(add('x', { parentId: foreign.id })).rejects.toThrow(
      'same page',
    )
  })

  it('updates type and content', async () => {
    const b = await add('hello')
    await updateBlock(db, b.id, {
      type: 'heading',
      content: { text: 'Hi', level: 1 },
    })
    expect(await db.blocks.get(b.id)).toMatchObject({
      type: 'heading',
      content: { text: 'Hi', level: 1 },
    })
  })

  it('reorders and nests blocks', async () => {
    const a = await add('a')
    const b = await add('b')
    const c = await add('c')

    await moveBlock(db, c.id, null, 0)
    expect(await texts(null)).toEqual(['c', 'a', 'b'])

    await moveBlock(db, b.id, a.id, 0) // indent b under a
    expect(await texts(null)).toEqual(['c', 'a'])
    expect(await texts(a.id)).toEqual(['b'])

    await expect(moveBlock(db, a.id, b.id, 0)).rejects.toThrow('itself')
  })

  it('soft-deletes a block and its nested blocks', async () => {
    const parent = await add('parent')
    const child = await add('child', { parentId: parent.id })
    const grandchild = await add('grandchild', { parentId: child.id })
    await add('keep')

    await deleteBlock(db, parent.id)

    expect(await texts(null)).toEqual(['keep'])
    for (const id of [parent.id, child.id, grandchild.id]) {
      expect((await db.blocks.get(id))?.deletedAt).toEqual(expect.any(Number))
    }
    await expect(updateBlock(db, child.id, { content: {} })).rejects.toThrow(
      'not found',
    )
  })
})

describe('saveBlockChanges', () => {
  const upsert = (id: string, text: string, order: string) => ({
    id,
    parentId: null,
    type: 'paragraph',
    content: { text },
    order,
  })

  it('creates and updates blocks using the given ids', async () => {
    await saveBlockChanges(db, pageId, {
      upserts: [upsert('x', 'one', 'a0'), upsert('y', 'two', 'a1')],
      deletes: [],
    })
    expect(await texts(null)).toEqual(['one', 'two'])

    const created = (await db.blocks.get('x'))!.createdAt
    await saveBlockChanges(db, pageId, {
      upserts: [upsert('x', 'ONE', 'a0')],
      deletes: [],
    })
    expect(await texts(null)).toEqual(['ONE', 'two'])
    expect((await db.blocks.get('x'))?.createdAt).toBe(created)
  })

  it('soft-deletes exactly the listed blocks, and revives on upsert', async () => {
    await saveBlockChanges(db, pageId, {
      upserts: [upsert('x', 'one', 'a0'), upsert('y', 'two', 'a1')],
      deletes: [],
    })
    await saveBlockChanges(db, pageId, { upserts: [], deletes: ['x'] })
    expect(await texts(null)).toEqual(['two'])
    expect((await db.blocks.get('x'))?.deletedAt).toEqual(expect.any(Number))

    // e.g. undo in the editor brings the same block id back
    await saveBlockChanges(db, pageId, {
      upserts: [upsert('x', 'one', 'a0')],
      deletes: [],
    })
    expect(await texts(null)).toEqual(['one', 'two'])
  })

  it('is all-or-nothing and refuses blocks from another page', async () => {
    const nb = (await db.pages.get(pageId))!.notebookId
    const other = await createPage(db, nb)
    const foreign = await createBlock(db, {
      pageId: other.id,
      type: 'paragraph',
    })

    await expect(
      saveBlockChanges(db, pageId, {
        upserts: [upsert('new', 'fresh', 'a0'), upsert(foreign.id, 'x', 'a1')],
        deletes: [],
      }),
    ).rejects.toThrow('another page')
    expect(await db.blocks.get('new')).toBeUndefined()
  })
})
