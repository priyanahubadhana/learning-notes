import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage } from '../../pages/pageService'
import { identityPlan, movePage } from '../pdfTools/pageOps'
import { applyPageEdit } from '../pdfTools/pdfEditService'

// A book over the cap (the real cap is 200 MB; not worth allocating here).
vi.mock('./originalCopy', async (orig) => ({
  ...(await orig<typeof import('./originalCopy')>()),
  canKeepOriginal: () => false,
}))

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(async () => {
  await db.delete()
})

describe('a book over the cap', () => {
  it('is edited, but no first copy is kept (Undo still works)', async () => {
    const ws = await getOrCreateDefaultWorkspace(db)
    const nb = await createNotebook(db, ws.id, 'Books')
    const page = await createPage(db, nb.id, null, 'Big')
    const now = Date.now()
    const fileId = crypto.randomUUID()
    await db.bookFiles.add({
      id: fileId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      pageId: page.id,
      name: 'big.pdf',
      mime: 'application/pdf',
      size: 6,
      data: new Uint8Array([37, 80, 68, 70, 45, 1]).buffer as ArrayBuffer,
    })
    await db.pages.update(page.id, {
      source: { kind: 'book', fileId, format: 'pdf', pageCount: 3 },
    })
    const undo = await applyPageEdit(
      db,
      page.id,
      movePage(identityPlan(3), 2, 0),
      [
        { w: 1, h: 1 },
        { w: 1, h: 1 },
        { w: 1, h: 1 },
      ],
      new Uint8Array([37, 80, 68, 70, 45, 2]),
      Date.now(),
      { keepOriginal: true },
    )
    const file = await db.bookFiles.get(fileId)
    expect(new Uint8Array(file!.data)[5]).toBe(2)
    expect(file!.original).toBeUndefined()
    expect(undo.file.data.byteLength).toBe(6)
  })
})
