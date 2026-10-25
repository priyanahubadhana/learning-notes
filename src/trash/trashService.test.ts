import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  createNotebook,
  deleteNotebook,
  getNotebook,
} from '../notebooks/notebookService'
import {
  createPage,
  deletePage,
  getPage,
  listChildPages,
} from '../pages/pageService'
import {
  listTrash,
  purgeNotebook,
  purgePage,
  restoreNotebook,
  restorePage,
} from './trashService'

let db: LearningNotesDB
let ws: string
let clock = 1_700_000_000_000

/** Each delete happens at a distinct time, like a real user. */
const tick = () => vi.setSystemTime((clock += 1000))

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  tick()
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  vi.useRealTimers()
  await db.delete()
})

const trashTitles = async () =>
  (await listTrash(db, ws)).map((i) => `${i.kind}:${i.title}`)

/** Notebook "NB" with page A (sub-page A1 with a block) and page B. */
async function sample() {
  const nb = await createNotebook(db, ws, 'NB')
  const a = await createPage(db, nb.id, null, 'A')
  const a1 = await createPage(db, nb.id, a.id, 'A1')
  const b = await createPage(db, nb.id, null, 'B')
  const block = await createBlock(db, {
    pageId: a1.id,
    type: 'paragraph',
    content: { text: 'hello' },
  })
  return { nb, a, a1, b, block }
}

describe('listTrash', () => {
  it('shows only what was deleted directly, newest first', async () => {
    const { nb, a } = await sample()
    tick()
    await deletePage(db, a.id) // A and A1 together
    expect(await trashTitles()).toEqual(['page:A'])

    tick()
    await deleteNotebook(db, nb.id) // NB with B (A was already deleted)
    const items = await listTrash(db, ws)
    expect(items.map((i) => `${i.kind}:${i.title}`)).toEqual([
      'notebook:NB',
      'page:A',
    ])
    expect(items[0]).toMatchObject({ pageCount: 1 }) // just B
  })
})

describe('restore', () => {
  it('restores a notebook with what was deleted with it, not earlier deletes', async () => {
    const { nb, a, b } = await sample()
    tick()
    await deletePage(db, a.id)
    tick()
    await deleteNotebook(db, nb.id)

    await restoreNotebook(db, nb.id)
    expect(await getNotebook(db, nb.id)).toBeDefined()
    expect(await getPage(db, b.id)).toBeDefined()
    expect(await getPage(db, a.id)).toBeUndefined() // still in Trash
    expect(await trashTitles()).toEqual(['page:A'])
  })

  it('restores a page with its sub-pages and blocks', async () => {
    const { a, a1 } = await sample()
    tick()
    await deletePage(db, a.id)

    await restorePage(db, a.id)
    expect((await getPage(db, a1.id))?.parentId).toBe(a.id)
    expect((await listBlocks(db, a1.id)).map((b) => b.content.text)).toEqual([
      'hello',
    ])
    expect(await trashTitles()).toEqual([])
  })

  it('brings back only the notebook if the page’s notebook is in Trash', async () => {
    const { nb, a, b } = await sample()
    tick()
    await deletePage(db, a.id)
    tick()
    await deleteNotebook(db, nb.id)

    await restorePage(db, a.id)
    expect(await getNotebook(db, nb.id)).toBeDefined()
    expect(await getPage(db, a.id)).toBeDefined()
    expect(await getPage(db, b.id)).toBeUndefined() // other page stays in Trash
    expect(await trashTitles()).toEqual(['page:B'])
  })

  it('moves a page to the top level if its parent is still deleted', async () => {
    const { nb, a, a1 } = await sample()
    tick()
    await deletePage(db, a1.id)
    tick()
    await deletePage(db, a.id)

    await restorePage(db, a1.id)
    expect((await getPage(db, a1.id))?.parentId).toBeNull()
    const top = await listChildPages(db, nb.id, null)
    expect(top.map((p) => p.title)).toEqual(['B', 'A1']) // added at the end
  })
})

describe('delete forever', () => {
  it('erases a notebook with all its deleted pages and blocks, keeping markers', async () => {
    const { nb, a, a1, block } = await sample()
    tick()
    await deletePage(db, a.id) // deleted earlier, separately
    tick()
    await deleteNotebook(db, nb.id)

    await purgeNotebook(db, nb.id)
    expect(await trashTitles()).toEqual([])

    const marker = await db.notebooks.get(nb.id)
    expect(marker).toMatchObject({ title: '', purgedAt: expect.any(Number) })
    expect((await db.pages.get(a1.id))?.title).toBe('')
    expect((await db.blocks.get(block.id))?.content).toEqual({})
    await expect(restoreNotebook(db, nb.id)).rejects.toThrow('not in Trash')
  })

  it('erases a page and its sub-pages only', async () => {
    const { a, a1, b, block } = await sample()
    tick()
    await deletePage(db, a.id)
    tick()
    await deletePage(db, b.id)

    await purgePage(db, a.id)
    expect(await trashTitles()).toEqual(['page:B'])
    expect((await db.pages.get(a1.id))?.purgedAt).toEqual(expect.any(Number))
    expect((await db.blocks.get(block.id))?.content).toEqual({})
    expect((await db.pages.get(b.id))?.title).toBe('B')
  })

  it('is all-or-nothing', async () => {
    const { a, a1 } = await sample()
    tick()
    await deletePage(db, a.id)
    vi.spyOn(db.blocks, 'bulkUpdate').mockRejectedValue(new Error('disk error'))

    await expect(purgePage(db, a.id)).rejects.toThrow('disk error')
    expect((await db.pages.get(a1.id))?.title).toBe('A1')
    expect(await trashTitles()).toEqual(['page:A'])
  })
})
