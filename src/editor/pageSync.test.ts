import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import type { BlockDraft } from './diff'
import { createPageSync } from './pageSync'

let db: LearningNotesDB
let pageId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id)
  pageId = (await createPage(db, nb.id)).id
})

afterEach(async () => {
  vi.useRealTimers()
  await db.delete()
})

/** Simulates the editor: drafts for the shown (known-type) records. */
async function openPage() {
  const records = await listBlocks(db, pageId)
  let editor: BlockDraft[] = records
    .filter((r) => r.type === 'paragraph' && r.parentId === null)
    .map(({ id, parentId, type, content }) => ({ id, parentId, type, content }))
  const sync = createPageSync(db, pageId, records, () => editor, 500)
  return {
    sync,
    get editor() {
      return editor
    },
    set editor(next: BlockDraft[]) {
      editor = next
      sync.changed()
    },
  }
}

const updatedAts = async () =>
  (await db.blocks.toArray()).map((b) => b.updatedAt).join()

describe('createPageSync', () => {
  it('opening a page (and stray change events) writes nothing', async () => {
    await createBlock(db, { pageId, type: 'paragraph', content: { text: 'A' } })
    const before = await updatedAts()
    const putSpy = vi.spyOn(db.blocks, 'bulkPut')

    const page = await openPage()
    page.sync.changed() // editor fires a change event without edits
    await page.sync.flush()

    expect(putSpy).not.toHaveBeenCalled()
    expect(await updatedAts()).toBe(before)
  })

  it('debounces edits into one save', async () => {
    // Fake only timeouts; fake-indexeddb needs real setImmediate.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const page = await openPage()
    const putSpy = vi.spyOn(db.blocks, 'bulkPut')

    for (const text of ['H', 'He', 'Hel', 'Hello']) {
      page.editor = [
        { id: 'b1', parentId: null, type: 'paragraph', content: { text } },
      ]
      await vi.advanceTimersByTimeAsync(100)
    }
    expect(putSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(500) // debounce fires, save starts
    await page.sync.flush() // wait for the in-progress save to finish
    expect(putSpy).toHaveBeenCalledTimes(1)
    expect((await db.blocks.get('b1'))?.content).toEqual({ text: 'Hello' })
  })

  it('keeps hidden unknown-type blocks when the user deletes others', async () => {
    const shown = await createBlock(db, { pageId, type: 'paragraph' })
    const mystery = await createBlock(db, { pageId, type: 'future-block' })
    const inside = await createBlock(db, {
      pageId,
      type: 'paragraph',
      parentId: mystery.id,
    })

    const page = await openPage()
    // The simulated editor only shows top-level known blocks (like mapping.ts).
    expect(page.editor.map((d) => d.id)).toContain(shown.id)
    page.editor = [] // user deletes everything they can see
    await page.sync.flush()

    expect((await db.blocks.get(shown.id))?.deletedAt).toEqual(
      expect.any(Number),
    )
    expect((await db.blocks.get(mystery.id))?.deletedAt).toBeNull()
    expect((await db.blocks.get(inside.id))?.deletedAt).toBeNull()
  })
})
