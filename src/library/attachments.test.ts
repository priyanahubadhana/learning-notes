/**
 * @vitest-environment jsdom
 */
import { strToU8 } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { checkedRow } from '../share/checkRows'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { fileRef, parseFileRef, sizeText } from '../core/fileRef'
import { FileError, looksReadable, saveAttachment } from '../core/attachments'
import { openAttachmentInReader } from './attachmentReader'
import type { BookInspector } from './libraryService'

let db: LearningNotesDB
let ws: string
let pageId: string
beforeEach(async () => {
  db = createTestDb()
  await db.open()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  const nb = await createNotebook(db, ws, 'N')
  pageId = (await createPage(db, nb.id, null, 'P')).id
})
afterEach(() => db.close())

const inspect: BookInspector = async (_f, _b, name) => ({
  title: name.replace(/\.\w+$/, ''),
})
const pdf = () =>
  new File([strToU8('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF')], 'Notes.pdf', {
    type: 'application/pdf',
  })

describe('file references', () => {
  it('round-trips and rejects other text', () => {
    const id = '0a1b2c3d-0000-4000-8000-123456789abc'
    expect(parseFileRef(fileRef(id))).toBe(id)
    expect(parseFileRef('lnimg:' + id)).toBeNull()
    expect(parseFileRef('https://x.test/a.pdf')).toBeNull()
    expect(sizeText(2048)).toBe('2 KB')
    expect(looksReadable('a.PDF')).toBe(true)
    expect(looksReadable('a.zip')).toBe(false)
  })
})

describe('attached files', () => {
  it('keeps any file, telling books apart by their bytes', async () => {
    const zip = await saveAttachment(
      db,
      pageId,
      new File([new Uint8Array([1, 2, 3])], 'a.zip', { type: 'text/html' }),
    )
    expect(zip.mime).toBe('text/html') // stored, but only ever downloaded
    // A PDF called ".txt" with a wrong type is still a PDF.
    const sneaky = await saveAttachment(
      db,
      pageId,
      new File([strToU8('%PDF-1.4 x')], 'x.txt', { type: 'text/plain' }),
    )
    expect(sneaky.mime).toBe('application/pdf')
    expect((await db.bookFiles.get(zip.id))?.size).toBe(3)
  })

  it('refuses an empty file', async () => {
    await expect(
      saveAttachment(db, pageId, new File([], 'e.txt')),
    ).rejects.toBeInstanceOf(FileError)
  })

  it('opens a PDF in the reader once, then reuses the Library page', async () => {
    const file = await saveAttachment(db, pageId, pdf())
    const first = await openAttachmentInReader(db, ws, file.id, inspect)
    const second = await openAttachmentInReader(db, ws, file.id, inspect)
    expect(second.id).toBe(first.id)
    expect(first.source?.kind).toBe('book')
    expect(await db.bookFiles.count()).toBe(2) // the attachment and the book
  })

  it('does not open a file that is not a book', async () => {
    const f = await saveAttachment(
      db,
      pageId,
      new File([new Uint8Array([9, 9])], 'a.bin'),
    )
    await expect(
      openAttachmentInReader(db, ws, f.id, inspect),
    ).rejects.toBeInstanceOf(FileError)
  })

  it('passes the backup row check (any safe type, not an odd one)', async () => {
    const f = await saveAttachment(
      db,
      pageId,
      new File([new Uint8Array([1])], 'a.bin', { type: 'application/zip' }),
    )
    const row = { ...f, data: {} } as unknown as Record<string, unknown>
    expect(checkedRow('bookFiles', row)).not.toBeNull()
    expect(checkedRow('bookFiles', { ...row, mime: 'not a type' })).toBeNull()
  })
})
