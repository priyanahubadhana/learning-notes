import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage } from '../../pages/pageService'
import { createAnnotation } from '../annotations/annotationService'
import { identityPlan, movePage, removePages } from '../pdfTools/pageOps'
import { applyPageEdit, undoPageEdit } from '../pdfTools/pdfEditService'

/**
 * Slice 7f: the first copy of the book (`BookFile.original`) is kept by the
 * first Pages-grid edit, never replaced by a later one, and put back by Undo.
 * Page edits without the Reader v2 option never touch it.
 */

const bytes = (...b: number[]) => new Uint8Array([37, 80, 68, 70, 45, ...b])
const sizes = Array.from({ length: 4 }, () => ({ w: 600, h: 800 }))

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(async () => {
  await db.delete()
})

async function book() {
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id, 'Books')
  const page = await createPage(db, nb.id, null, 'Book')
  const now = Date.now()
  const fileId = crypto.randomUUID()
  await db.bookFiles.add({
    id: fileId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    pageId: page.id,
    name: 'b.pdf',
    mime: 'application/pdf',
    size: 6,
    data: bytes(1).buffer as ArrayBuffer,
  })
  await db.pages.update(page.id, {
    source: { kind: 'book', fileId, format: 'pdf', pageCount: 4 },
  })
  return { pageId: page.id, fileId }
}

const first = async (id: string) =>
  new Uint8Array((await db.bookFiles.get(id))!.data)[5]
const orig = async (id: string) => {
  const o = (await db.bookFiles.get(id))!.original
  return o ? new Uint8Array(o)[5] : undefined
}

describe('Restore original: the first copy', () => {
  it('the first edit keeps it; a later edit does not replace it', async () => {
    const { pageId, fileId } = await book()
    await applyPageEdit(
      db,
      pageId,
      movePage(identityPlan(4), 3, 0),
      sizes,
      bytes(2),
      Date.now(),
      { keepOriginal: true },
    )
    expect(await first(fileId)).toBe(2)
    expect(await orig(fileId)).toBe(1)
    await applyPageEdit(
      db,
      pageId,
      removePages(identityPlan(4), [1]),
      sizes,
      bytes(3),
      Date.now(),
      { keepOriginal: true },
    )
    expect(await first(fileId)).toBe(3)
    expect(await orig(fileId)).toBe(1)
  })

  it('Undo of the very first edit puts the book back and leaves no copy', async () => {
    const { pageId, fileId } = await book()
    const undo = await applyPageEdit(
      db,
      pageId,
      movePage(identityPlan(4), 3, 0),
      sizes,
      bytes(2),
      Date.now(),
      { keepOriginal: true },
    )
    await undoPageEdit(db, undo)
    expect(await first(fileId)).toBe(1)
    expect(await orig(fileId)).toBeUndefined()
  })

  it('the old page edits (without the option) never keep a copy', async () => {
    const { pageId, fileId } = await book()
    await applyPageEdit(
      db,
      pageId,
      movePage(identityPlan(4), 3, 0),
      sizes,
      bytes(2),
    )
    expect(await orig(fileId)).toBeUndefined()
  })

  it('marks follow their pages in the same edit (a bookmark on page 4 moves to 1)', async () => {
    const { pageId } = await book()
    const a = await createAnnotation(db, {
      pageId,
      kind: 'bookmark',
      anchor: { type: 'pdf', page: 4, rects: [] },
    })
    await applyPageEdit(
      db,
      pageId,
      movePage(identityPlan(4), 3, 0),
      sizes,
      bytes(2),
      Date.now(),
      { keepOriginal: true },
    )
    const got = await db.annotations.get(a.id)
    expect(got?.anchor).toMatchObject({ type: 'pdf', page: 1 })
  })
})
