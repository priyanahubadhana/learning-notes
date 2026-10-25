import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from './db'
import { byOrder } from './order'
import { createTestDb } from './testing'
import type { Block, Notebook, Page } from './types'

const T = 1_700_000_000_000 // fixed timestamp for predictable tests
const base = { createdAt: T, updatedAt: T, deletedAt: null }

let db: LearningNotesDB

beforeEach(() => {
  db = createTestDb()
})

afterEach(async () => {
  await db.delete()
})

const notebook = (
  id: string,
  workspaceId: string,
  order: string,
): Notebook => ({
  ...base,
  id,
  workspaceId,
  title: id,
  order,
})

const page = (id: string, parentId: string | null, order: string): Page => ({
  ...base,
  id,
  notebookId: 'nb1',
  parentId,
  title: id,
  order,
})

const block = (id: string, parentId: string | null, order: string): Block => ({
  ...base,
  id,
  pageId: 'p1',
  parentId,
  type: 'paragraph',
  content: { text: id },
  order,
})

describe('LearningNotesDB', () => {
  it('stores and reads a workspace', async () => {
    await db.workspaces.add({ ...base, id: 'w1', name: 'Mine' })
    expect(await db.workspaces.get('w1')).toMatchObject({ name: 'Mine' })
  })

  it('finds notebooks by workspace, sorted by order key', async () => {
    await db.notebooks.bulkAdd([
      notebook('b', 'w1', 'a2'),
      notebook('a', 'w1', 'a1'),
      notebook('other', 'w2', 'a0'),
    ])
    const list = await db.notebooks.where('workspaceId').equals('w1').toArray()
    expect(list.sort(byOrder).map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('supports nested pages via parentId', async () => {
    await db.pages.bulkAdd([
      page('root', null, 'a0'),
      page('child2', 'root', 'a2'),
      page('child1', 'root', 'a1'),
    ])
    const children = await db.pages.where('parentId').equals('root').toArray()
    expect(children.sort(byOrder).map((p) => p.id)).toEqual([
      'child1',
      'child2',
    ])

    // Top-level pages: filter on null (null cannot be indexed).
    const roots = await db.pages
      .where('notebookId')
      .equals('nb1')
      .filter((p) => p.parentId === null)
      .toArray()
    expect(roots.map((p) => p.id)).toEqual(['root'])
  })

  it('stores each block as its own record with JSON content preserved', async () => {
    const rich: Block = {
      ...block('b1', null, 'a0'),
      type: 'checkListItem',
      content: { text: 'Buy milk', checked: true, marks: [{ bold: true }] },
    }
    await db.blocks.bulkAdd([
      rich,
      block('b2', null, 'a1'),
      block('b2a', 'b2', 'a0'),
    ])

    expect(await db.blocks.get('b1')).toEqual(rich)
    expect(await db.blocks.where('pageId').equals('p1').count()).toBe(3)
    const nested = await db.blocks.where('parentId').equals('b2').toArray()
    expect(nested.map((b) => b.id)).toEqual(['b2a'])
  })
})
