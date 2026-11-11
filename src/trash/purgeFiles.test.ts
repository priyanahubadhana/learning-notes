import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlock } from '../core/blockService'
import { saveAttachment } from '../core/attachments'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { imageRef } from '../images/imageRef'
import { saveEditedImage, saveImage } from '../images/imageService'
import { createNotebook, deleteNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { purgeNotebook, purgePage } from './trashService'

let db: LearningNotesDB
let ws: string
let clock = 1_700_000_000_000

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime((clock += 1000))
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  vi.useRealTimers()
  await db.delete()
})

const png = (bytes = 8) =>
  Object.assign(
    new Blob([new Uint8Array(bytes).fill(7)], { type: 'image/png' }),
    {
      name: 'p.png',
    },
  )

/** A page with a picture block, an edited copy of it, and an attached file. */
async function pageWithPicture(title: string, notebookId: string) {
  const page = await createPage(db, notebookId, null, title)
  const original = await saveImage(db, png())
  const edited = await saveEditedImage(db, original.id, {
    data: new Uint8Array(6).fill(9).buffer,
    type: 'image/png',
    width: 1,
    height: 1,
  })
  await createBlock(db, {
    pageId: page.id,
    type: 'image',
    content: { props: { url: imageRef(edited.id) } },
  })
  const file = await saveAttachment(
    db,
    page.id,
    new Blob(['secret notes'], { type: 'text/plain' }),
  )
  return { page, original, edited, file }
}

const bytesOf = async (id: string) =>
  (await db.images.get(id))?.data.byteLength ?? 0

describe('Delete forever removes the page’s pictures and files', () => {
  it('erases the picture, its original and the attached file', async () => {
    const nb = await createNotebook(db, ws, 'NB')
    const { page, original, edited, file } = await pageWithPicture('A', nb.id)
    expect(await bytesOf(edited.id)).toBeGreaterThan(0)
    vi.setSystemTime((clock += 1000))
    await deletePage(db, page.id)
    // In Trash the page can still be restored: its pictures stay.
    expect(await bytesOf(edited.id)).toBeGreaterThan(0)

    await purgePage(db, page.id)
    for (const id of [edited.id, original.id]) {
      const row = await db.images.get(id)
      expect(row?.data.byteLength).toBe(0)
      expect(row?.purgedAt).toEqual(expect.any(Number))
    }
    const stored = await db.bookFiles.get(file.id)
    expect(stored?.data.byteLength).toBe(0)
    expect(stored?.purgedAt).toEqual(expect.any(Number))
  })

  it('keeps a picture another page still shows', async () => {
    const nb = await createNotebook(db, ws, 'NB')
    const { page, edited, original } = await pageWithPicture('A', nb.id)
    const other = await createPage(db, nb.id, null, 'B')
    await createBlock(db, {
      pageId: other.id,
      type: 'image',
      content: { props: { url: imageRef(edited.id) } },
    })
    vi.setSystemTime((clock += 1000))
    await deletePage(db, page.id)
    await purgePage(db, page.id)
    expect(await bytesOf(edited.id)).toBeGreaterThan(0)
    expect(await bytesOf(original.id)).toBeGreaterThan(0)
  })

  it('keeps a picture that a page in Trash (restorable) still shows', async () => {
    const nb = await createNotebook(db, ws, 'NB')
    const { page, edited } = await pageWithPicture('A', nb.id)
    const other = await createPage(db, nb.id, null, 'B')
    await createBlock(db, {
      pageId: other.id,
      type: 'image',
      content: { props: { url: imageRef(edited.id) } },
    })
    vi.setSystemTime((clock += 1000))
    await deletePage(db, other.id) // in Trash, not erased
    vi.setSystemTime((clock += 1000))
    await deletePage(db, page.id)
    await purgePage(db, page.id)
    expect(await bytesOf(edited.id)).toBeGreaterThan(0)
  })

  it('a deleted notebook takes every page’s pictures with it', async () => {
    const nb = await createNotebook(db, ws, 'NB')
    const a = await pageWithPicture('A', nb.id)
    const b = await pageWithPicture('B', nb.id)
    vi.setSystemTime((clock += 1000))
    await deleteNotebook(db, nb.id)
    await purgeNotebook(db, nb.id)
    for (const id of [a.edited.id, a.original.id, b.edited.id, b.original.id])
      expect(await bytesOf(id)).toBe(0)
    expect((await db.bookFiles.get(a.file.id))?.data.byteLength).toBe(0)
    expect((await db.bookFiles.get(b.file.id))?.data.byteLength).toBe(0)
  })
})
