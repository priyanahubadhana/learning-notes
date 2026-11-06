import { FileError, isReadable } from '../core/attachments'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import type { Page } from '../core/types'
import { t } from '../i18n/t'
import { importBook, type BookInspector } from './libraryService'

/**
 * Opens a file attached to a page (G2) in the reader: the first time it is
 * added to the Library as a book; after that the same Library page is used.
 * The app (App.tsx) hands this to the editor, so the editor never imports
 * the Library.
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
