import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import {
  createPage,
  deletePage,
  getPage,
  getPagePath,
  listChildPages,
  listPages,
  movePage,
  movePageToTopLevel,
  renamePage,
} from './pageService'

let db: LearningNotesDB
let nb: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  nb = (await createNotebook(db, ws.id)).id
})

afterEach(async () => {
  await db.delete()
})

const titles = async (parentId: string | null) =>
  (await listChildPages(db, nb, parentId)).map((p) => p.title)

describe('pageService', () => {
  it('creates top-level and nested pages in order', async () => {
    const a = await createPage(db, nb, null, 'A')
    await createPage(db, nb, null, 'B')
    await createPage(db, nb, a.id, 'A1')
    await createPage(db, nb, a.id, 'A2')

    expect(await titles(null)).toEqual(['A', 'B'])
    expect(await titles(a.id)).toEqual(['A1', 'A2'])
  })

  it('rejects a parent from another notebook', async () => {
    const ws = await getOrCreateDefaultWorkspace(db)
    const other = await createNotebook(db, ws.id)
    const foreign = await createPage(db, other.id)
    await expect(createPage(db, nb, foreign.id)).rejects.toThrow(
      'same notebook',
    )
  })

  it('getPage and listPages return only live pages', async () => {
    const a = await createPage(db, nb, null, 'A')
    const b = await createPage(db, nb, a.id, 'B')
    const c = await createPage(db, nb, null, 'C')
    await deletePage(db, c.id)

    expect((await getPage(db, a.id))?.title).toBe('A')
    expect(await getPage(db, c.id)).toBeUndefined()
    expect((await listPages(db, nb)).map((p) => p.id).sort()).toEqual(
      [a.id, b.id].sort(),
    )
  })

  it('getPagePath returns top-level → page, or [] if deleted', async () => {
    const a = await createPage(db, nb, null, 'A')
    const b = await createPage(db, nb, a.id, 'B')
    const c = await createPage(db, nb, b.id, 'C')

    expect((await getPagePath(db, c.id)).map((p) => p.title)).toEqual([
      'A',
      'B',
      'C',
    ])
    expect((await getPagePath(db, a.id)).map((p) => p.title)).toEqual(['A'])
    await deletePage(db, a.id)
    expect(await getPagePath(db, c.id)).toEqual([])
  })

  it('renames a page', async () => {
    const p = await createPage(db, nb)
    await renamePage(db, p.id, 'Renamed')
    expect((await db.pages.get(p.id))?.title).toBe('Renamed')
  })

  it('reorders and re-parents pages', async () => {
    const a = await createPage(db, nb, null, 'A')
    const b = await createPage(db, nb, null, 'B')
    const c = await createPage(db, nb, null, 'C')

    await movePage(db, c.id, null, 0)
    expect(await titles(null)).toEqual(['C', 'A', 'B'])

    await movePage(db, b.id, a.id, 0) // B becomes a sub-page of A
    expect(await titles(null)).toEqual(['C', 'A'])
    expect(await titles(a.id)).toEqual(['B'])

    await movePage(db, b.id, null, 99) // and back to top level, at the end
    expect(await titles(null)).toEqual(['C', 'A', 'B'])
  })

  it('moves a sub-page to the top level, at the end, with its own sub-pages', async () => {
    const a = await createPage(db, nb, null, 'A')
    await createPage(db, nb, null, 'B')
    const a1 = await createPage(db, nb, a.id, 'A1')
    await createPage(db, nb, a1.id, 'A1x')

    await movePageToTopLevel(db, a1.id)
    expect(await titles(null)).toEqual(['A', 'B', 'A1'])
    expect(await titles(a.id)).toEqual([])
    expect(await titles(a1.id)).toEqual(['A1x'])
  })

  it('refuses to move a page inside itself or its descendants', async () => {
    const a = await createPage(db, nb)
    const child = await createPage(db, nb, a.id)
    const grandchild = await createPage(db, nb, child.id)
    await expect(movePage(db, a.id, a.id, 0)).rejects.toThrow('itself')
    await expect(movePage(db, a.id, grandchild.id, 0)).rejects.toThrow('itself')
  })

  it('soft-deletes a page, its sub-pages and their blocks only', async () => {
    const a = await createPage(db, nb, null, 'A')
    const keep = await createPage(db, nb, null, 'Keep')
    const child = await createPage(db, nb, a.id)
    const grandchild = await createPage(db, nb, child.id)
    const block = await createBlock(db, {
      pageId: grandchild.id,
      type: 'paragraph',
    })
    const keptBlock = await createBlock(db, {
      pageId: keep.id,
      type: 'paragraph',
    })

    await deletePage(db, a.id)

    expect(await titles(null)).toEqual(['Keep'])
    for (const id of [a.id, child.id, grandchild.id]) {
      expect((await db.pages.get(id))?.deletedAt).toEqual(expect.any(Number))
    }
    expect((await db.blocks.get(block.id))?.deletedAt).toEqual(
      expect.any(Number),
    )
    expect((await db.blocks.get(keptBlock.id))?.deletedAt).toBeNull()
    await expect(createPage(db, nb, a.id)).rejects.toThrow('not found')
  })
})
