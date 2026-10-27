import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { clearStash, recoverStash, stashChanges } from './pendingStash'

let db: LearningNotesDB
let pageId: string
const store = new Map<string, string>()

beforeEach(async () => {
  store.clear()
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  })
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  pageId = (
    await createPage(db, (await createNotebook(db, ws.id, 'NB')).id, null)
  ).id
})
afterEach(async () => {
  await db.delete()
})

const upsert = (id: string, text: string) => ({
  id,
  parentId: null,
  type: 'paragraph',
  content: { text: [{ type: 'text', text, styles: {} }] },
  order: 'a0',
})

describe('kept changes', () => {
  it('come back when the page is opened, once', async () => {
    stashChanges(pageId, {
      upserts: [upsert('b1', 'typed at the end')],
      deletes: [],
    })
    expect(await recoverStash(db, pageId)).toBe(true)
    expect((await listBlocks(db, pageId)).map((b) => b.id)).toEqual(['b1'])
    expect(store.size).toBe(0)
    expect(await recoverStash(db, pageId)).toBe(false) // nothing left
  })

  it('applying them twice is harmless', async () => {
    const changes = { upserts: [upsert('b1', 'x')], deletes: [] }
    stashChanges(pageId, changes)
    await recoverStash(db, pageId)
    stashChanges(pageId, changes)
    await recoverStash(db, pageId)
    expect(await listBlocks(db, pageId)).toHaveLength(1)
  })

  it('nothing is kept for no changes; clearStash forgets', () => {
    stashChanges(pageId, { upserts: [], deletes: [] })
    expect(store.size).toBe(0)
    stashChanges(pageId, { upserts: [upsert('b1', 'x')], deletes: [] })
    clearStash(pageId)
    expect(store.size).toBe(0)
  })

  it('damaged or foreign text is ignored and removed', async () => {
    for (const bad of [
      '{',
      '[]',
      '{"changes":{"upserts":[{"id":1}],"deletes":[]}}',
    ]) {
      store.set(`learning-notes:pending:${pageId}`, bad)
      expect(await recoverStash(db, pageId)).toBe(false)
      expect(store.size).toBe(0)
    }
    expect(await listBlocks(db, pageId)).toHaveLength(0)
  })

  it('a page that is gone is skipped without an error', async () => {
    stashChanges('missing-page', { upserts: [upsert('b1', 'x')], deletes: [] })
    expect(await recoverStash(db, 'missing-page')).toBe(false)
    expect(store.size).toBe(0)
  })
})
