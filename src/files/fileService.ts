import { BOOK_MIME, detectBookFormat } from '../core/bookFormat'
import type { LearningNotesDB } from '../core/db'
import { isLive, newRecordFields } from '../core/records'
import type { BookFile, Page } from '../core/types'
import { t } from '../i18n/t'
import { importBook, type BookInspector } from '../library/libraryService'
import { MAX_ATTACHMENT_BYTES, attachmentMime } from './fileRef'

/** What is wrong with a file that cannot be attached. */
export class FileError extends Error {}

/**
 * Keeps a file chosen on this device, attached to a page. Stored in
 * `bookFiles` (so backup, sync, Trash and "Delete forever" already cover it).
 */
export async function saveAttachment(
  db: LearningNotesDB,
  pageId: string,
  file: Blob & { name?: string },
): Promise<BookFile> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new FileError(t('file.tooBig'))
  if (file.size === 0) throw new FileError(t('file.empty'))
  const data = await file.arrayBuffer()
  const bytes = new Uint8Array(data)
  // A book is told by its first bytes, never by the name or claimed type.
  const format = detectBookFormat(bytes)
  const stored: BookFile = {
    ...newRecordFields(),
    pageId,
    name: (file.name ?? 'File').slice(0, 300),
    mime: format ? BOOK_MIME[format] : attachmentMime(file.type),
    size: data.byteLength,
    data,
  }
  await db.bookFiles.add(stored)
  return stored
}

/** Whether a file name suggests a book (the real test is on the bytes). */
export const looksReadable = (name: string): boolean =>
  /\.(pdf|epub|docx)$/i.test(name)

/** Whether a stored file can be read as a book (PDF, EPUB, DOCX). */
export const isReadable = (file: Pick<BookFile, 'mime' | 'size'>): boolean =>
  file.size > 0 && Object.values(BOOK_MIME).includes(file.mime)

/**
 * Opens an attached PDF (or other book) in the reader: the first time it is
 * added to the Library as a book; after that the same Library page is used.
 */
export async function openAttachmentInReader(
  db: LearningNotesDB,
  workspaceId: string,
  fileId: string,
  inspect: BookInspector,
): Promise<Page> {
  const file = await db.bookFiles.get(fileId)
  if (!file || !isLive(file) || !isReadable(file)) {
    throw new FileError(t('file.missing'))
  }
  if (file.readerPageId) {
    const page = await db.pages.get(file.readerPageId)
    if (page && isLive(page)) return page
  }
  const page = await importBook(
    db,
    workspaceId,
    new File([file.data], file.name, { type: file.mime }),
    inspect,
  )
  await db.bookFiles.update(fileId, {
    readerPageId: page.id,
    updatedAt: Date.now(),
  })
  return page
}

/**
 * Saves the stored bytes out as a download. The type is always the generic
 * "octet-stream", so the browser never opens (and runs) the file itself.
 */
export async function downloadAttachment(
  db: LearningNotesDB,
  id: string,
): Promise<boolean> {
  const row = await db.bookFiles.get(id)
  if (!row || row.deletedAt !== null || row.data.byteLength === 0) return false
  const url = URL.createObjectURL(
    new Blob([row.data], { type: 'application/octet-stream' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = row.name || 'file'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}
