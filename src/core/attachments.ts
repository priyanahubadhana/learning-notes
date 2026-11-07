import { BOOK_MIME, detectBookFormat } from './bookFormat'
import type { LearningNotesDB } from './db'
import { MAX_ATTACHMENT_BYTES, attachmentMime } from './fileRef'
import { newRecordFields } from './records'
import type { BookFile } from './types'
import { t } from '../i18n/t'

/**
 * Files attached to a page (G2). Stored in `bookFiles`, so backup, sync,
 * Trash and "Delete forever" already cover them. Lives in core so the editor
 * block and the Library's reader hand-off share it without importing each
 * other.
 */

/** What is wrong with a file that cannot be attached. */
export class FileError extends Error {}

/** Keeps a file chosen on this device, attached to a page. */
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
 * Saves the stored bytes out as a download. The type is always the generic
 * "octet-stream", so the browser never opens (and runs) the file itself.
 */
/**
 * True when the file's bytes are on this device. False after a "Notes only"
 * restore (the block is there, the file is not) or when it was deleted.
 */
export async function attachmentAvailable(
  db: LearningNotesDB,
  id: string,
): Promise<boolean> {
  const row = await db.bookFiles.get(id)
  return !!row && row.deletedAt === null && row.data.byteLength > 0
}

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
