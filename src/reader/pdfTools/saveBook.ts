import { downloadFile } from '../../app/download'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { inspectBook } from '../../library/inspect'
import { importBook } from '../../library/libraryService'

/** A PDF made by a tool, as a new item in the Library. */
export async function saveAsBook(
  db: LearningNotesDB,
  fromPageId: string,
  bytes: Uint8Array,
  fileName: string,
): Promise<Page> {
  const from = await db.pages.get(fromPageId)
  const notebook = from ? await db.notebooks.get(from.notebookId) : undefined
  const workspaceId =
    notebook?.workspaceId ?? (await db.workspaces.toCollection().first())?.id
  if (!workspaceId) throw new Error('No workspace')
  const file = Object.assign(
    new Blob([bytes as BlobPart], { type: 'application/pdf' }),
    { name: fileName },
  )
  return importBook(db, workspaceId, file, inspectBook)
}

/** Saves the bytes as a PDF download. */
export function downloadPdf(fileName: string, bytes: Uint8Array): void {
  downloadFile(
    fileName,
    new Blob([bytes as BlobPart], { type: 'application/pdf' }),
  )
}

/** `Title` to a safe file name with `.pdf` (and a suffix before it). */
export function pdfName(title: string, suffix = ''): string {
  const base =
    [...title]
      .filter((c) => c.charCodeAt(0) >= 32)
      .join('')
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\.pdf$/i, '')
      .trim()
      .slice(0, 120) || 'Book'
  return `${base}${suffix}.pdf`
}
