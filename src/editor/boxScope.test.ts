import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks, saveBlockChanges } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { blocksOfBox, tagDrafts } from './boxScope'
import { createSnapshot, diffBlocks, type BlockDraft } from './diff'

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

const draft = (id: string, parentId: string | null = null): BlockDraft => ({
  id,
  parentId,
  type: 'paragraph',
  content: { text: id },
})

async function save(drafts: BlockDraft[], from = createSnapshot([], [])) {
  const { changes, next } = diffBlocks(from, drafts)
  await saveBlockChanges(db, pageId, changes)
  return { changes, next }
}

describe('box scope (Phase Q)', () => {
  it('a page with no boxes: every block, no box id written, nothing re-saved', async () => {
    const drafts = tagDrafts(
      [draft('a'), draft('b'), draft('c', 'b')],
      undefined,
    )
    const { next } = await save(drafts)
    const records = await listBlocks(db, pageId)
    expect(records.every((r) => !('boxId' in r))).toBe(true)
    expect(await blocksOfBox(db, pageId, records, undefined)).toBe(records)
    // Re-reading the same editor writes nothing.
    expect(diffBlocks(next, drafts).changes).toEqual({
      upserts: [],
      deletes: [],
    })
  })

  it('one editor per box sees and deletes only its own blocks', async () => {
    await db.pages.update(pageId, {
      boxes: [{ id: 'x', x: 20, y: 120, w: 90 }],
    })
    await save([draft('a')])
    const x = await save(tagDrafts([draft('b'), draft('c', 'b')], 'x'))
    const records = await listBlocks(db, pageId)
    expect(
      (await blocksOfBox(db, pageId, records, undefined)).map((b) => b.id),
    ).toEqual(['a'])
    expect(
      (await blocksOfBox(db, pageId, records, 'x')).map((b) => b.id),
    ).toEqual(['b', 'c'])
    expect(records.find((r) => r.id === 'b')?.boxId).toBe('x')
    expect(records.find((r) => r.id === 'c')?.boxId).toBeUndefined()
    // Emptying box x deletes b and c, never a.
    const { changes } = diffBlocks(x.next, [])
    expect(changes.deletes.sort()).toEqual(['b', 'c'])
  })

  it('a block moved back to the default box loses its box id', async () => {
    await db.pages.update(pageId, { boxes: [{ id: 'x', x: 0, y: 0, w: 50 }] })
    const x = await save(tagDrafts([draft('b')], 'x'))
    await save([draft('b')], x.next)
    const [b] = await listBlocks(db, pageId)
    expect('boxId' in b).toBe(false)
  })
})
