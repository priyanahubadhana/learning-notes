import { addBlocks, type BlockInput } from '../core/blockBulk'
import {
  BOOK_MIME,
  MAX_BOOK_BYTES,
  detectBookFormat,
  type BookFormat,
} from '../core/bookFormat'
import type { LearningNotesDB } from '../core/db'
import { getLive, isLive, newRecordFields } from '../core/records'
import type {
  BookFile,
  Notebook,
  Page,
  PageSource,
  SourceKind,
} from '../core/types'
import { t } from '../i18n/t'
import { saveImage } from '../images/imageService'
import {
  createNotebook,
  findNotebookOfKind,
} from '../notebooks/notebookService'
import { createPage, listChildPages } from '../pages/pageService'
import { plainText } from '../editor/mapping'
import { addDocxChapters } from './docxPages'

/**
 * The Library (C1/CR1): books and captured sources are pages of two special
 * notebooks, "Books" and "Sources". A book page holds the header data in
 * `Page.source`, the file in `bookFiles`, and three sections of ordinary
 * blocks (Highlights & notes, Summary, Cards). Tags, search and sub-pages
 * work as everywhere because these are ordinary pages.
 */

export class LibraryError extends Error {}

export type SourceNotebookKind = 'books' | 'sources'

/** Finds, or makes once, the Books or Sources notebook of a workspace. */
export async function ensureSourceNotebook(
  db: LearningNotesDB,
  workspaceId: string,
  kind: SourceNotebookKind,
): Promise<Notebook> {
  return db.transaction('rw', db.workspaces, db.notebooks, async () => {
    const found = await findNotebookOfKind(db, workspaceId, kind)
    if (found) return found
    return createNotebook(
      db,
      workspaceId,
      t(
        kind === 'books'
          ? 'library.notebook.books'
          : 'library.notebook.sources',
      ),
      kind,
    )
  })
}

/** What the Library learns about a file (done in the browser, see inspect.ts). */
export interface BookMeta {
  title?: string
  author?: string
  pageCount?: number
  /** A picture to use as the cover (any image type the app accepts). */
  cover?: Blob
  /** DOCX only: the document as HTML, to split into pages. */
  docxHtml?: string
}

/** Reads titles, covers and text out of a book. Injected so tests need no browser. */
export type BookInspector = (
  format: BookFormat,
  bytes: Uint8Array,
  fileName: string,
) => Promise<BookMeta>

/** "My book.pdf" → "My book". */
export const titleFromFileName = (name: string): string =>
  name
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .replace(/[_]+/g, ' ')
    .trim()
    .slice(0, 200)

/** The three sections every book page starts with. */
function bookSectionBlocks(): BlockInput[] {
  const heading = (key: Parameters<typeof t>[0]): BlockInput => ({
    type: 'heading',
    content: { level: 2, text: plainText(t(key)) },
  })
  const empty: BlockInput = { type: 'paragraph', content: { text: [] } }
  return [
    heading('library.section.highlights'),
    empty,
    heading('library.section.summary'),
    empty,
    heading('library.section.cards'),
  ]
}

/**
 * Imports one book file into the Books notebook. Throws `LibraryError` (with a
 * plain message) when the file is too big or is not a PDF, EPUB or DOCX. The
 * type is decided by the file's first bytes, never by its name.
 */
export async function importBook(
  db: LearningNotesDB,
  workspaceId: string,
  file: Blob & { name?: string },
  inspect: BookInspector,
  now: number = Date.now(),
): Promise<Page> {
  if (file.size > MAX_BOOK_BYTES)
    throw new LibraryError(t('library.err.tooBig'))
  const data = await file.arrayBuffer()
  const bytes = new Uint8Array(data)
  const format = await detectBookFormat(bytes)
  if (!format) throw new LibraryError(t('library.err.badType'))
  const fileName = (file.name ?? 'Book').slice(0, 300)
  let meta: BookMeta
  try {
    meta = await inspect(format, bytes, fileName)
  } catch (e) {
    console.error('Could not read the book', e)
    throw new LibraryError(t('library.err.unreadable'))
  }
  const notebook = await ensureSourceNotebook(db, workspaceId, 'books')
  let coverImageId: string | undefined
  if (meta.cover) {
    try {
      coverImageId = (await saveImage(db, meta.cover)).id
    } catch (e) {
      console.error('Could not keep the cover', e) // the book still imports
    }
  }
  const page = await createPage(
    db,
    notebook.id,
    null,
    (meta.title?.trim() || titleFromFileName(fileName) || '').slice(0, 200),
  )
  const stored: BookFile = {
    ...newRecordFields(),
    pageId: page.id,
    name: fileName,
    mime: BOOK_MIME[format],
    size: data.byteLength,
    data,
  }
  const source: PageSource = {
    kind: 'book',
    fileId: stored.id,
    format,
    capturedAt: now,
    ...(meta.author ? { author: meta.author.slice(0, 200) } : {}),
    ...(meta.pageCount ? { pageCount: meta.pageCount } : {}),
    ...(coverImageId ? { coverImageId } : {}),
    progress: 0,
  }
  await db.bookFiles.add(stored)
  await db.pages.update(page.id, {
    source,
    ...(format === 'docx' ? { readFirst: true as const } : {}),
    updatedAt: Date.now(),
  })
  await addBlocks(db, page.id, bookSectionBlocks())
  if (format === 'docx' && meta.docxHtml) {
    await addDocxChapters(
      db,
      { ...page, source },
      meta.docxHtml,
      t('library.docx.start'),
    )
  }
  return (await db.pages.get(page.id)) ?? { ...page, source }
}

/** Starts reading a source: PDF/EPUB in the reader, anything else as pages. */
export async function continueTarget(
  db: LearningNotesDB,
  page: Page,
): Promise<{ kind: 'read'; at?: string } | { kind: 'page'; id: string }> {
  const format = page.source?.format
  if (page.source?.kind === 'book' && (format === 'pdf' || format === 'epub')) {
    return { kind: 'read', at: page.source.at }
  }
  if (format === 'docx') {
    const first = (await listChildPages(db, page.notebookId, page.id))[0]
    if (first) return { kind: 'page', id: first.id }
  }
  return { kind: 'page', id: page.id }
}

/** Where a source stands. */
export type ReadStatus = 'new' | 'reading' | 'finished'

export function readStatus(source: PageSource | undefined): ReadStatus {
  const p = source?.progress ?? 0
  if (p >= 0.98) return 'finished'
  return p > 0 || source?.at ? 'reading' : 'new'
}

/** Whole percent for the gallery. */
export const progressPercent = (source: PageSource | undefined): number =>
  Math.round(Math.min(1, Math.max(0, source?.progress ?? 0)) * 100)

export type SourceFilter = 'all' | 'books' | 'videos' | 'articles' | 'pasted'

const FILTER_KINDS: Record<Exclude<SourceFilter, 'all'>, SourceKind[]> = {
  books: ['book', 'file'],
  videos: ['video', 'audio'],
  articles: ['article'],
  pasted: ['paste'],
}

const matchesFilter = (
  source: PageSource | undefined,
  filter: SourceFilter,
): boolean =>
  !!source && (filter === 'all' || FILTER_KINDS[filter].includes(source.kind))

/**
 * Every source page (top level of the Books and Sources notebooks), newest
 * activity first: last opened, else captured.
 */
export async function listSources(
  db: LearningNotesDB,
  workspaceId: string,
  filter: SourceFilter = 'all',
): Promise<Page[]> {
  const notebooks = (
    await db.notebooks.where('workspaceId').equals(workspaceId).toArray()
  ).filter((n) => isLive(n) && (n.kind === 'books' || n.kind === 'sources'))
  if (notebooks.length === 0) return []
  const pages = await db.pages
    .where('notebookId')
    .anyOf(notebooks.map((n) => n.id))
    .toArray()
  const recency = (p: Page) =>
    p.source?.openedAt ?? p.source?.capturedAt ?? p.createdAt
  return pages
    .filter(
      (p) =>
        isLive(p) && p.parentId === null && matchesFilter(p.source, filter),
    )
    .sort((a, b) => recency(b) - recency(a))
}

/** The stored file of a book page, or undefined (gone, or "notes only" left it out). */
export async function getBookFile(
  db: LearningNotesDB,
  pageId: string,
): Promise<BookFile | undefined> {
  const page = await db.pages.get(pageId)
  const fileId = page?.source?.fileId
  if (!fileId) return undefined
  const file = await db.bookFiles.get(fileId)
  return file && isLive(file) && file.data.byteLength > 0 ? file : undefined
}

/** Fields of `PageSource` the reader updates while reading. */
export type ProgressPatch = Partial<
  Pick<PageSource, 'progress' | 'at' | 'openedAt' | 'pageCount'>
>

/** Saves reading progress. Called on pause, hide and every 30 s, never per scroll. */
export async function saveProgress(
  db: LearningNotesDB,
  pageId: string,
  patch: ProgressPatch,
): Promise<void> {
  await db.transaction('rw', db.pages, async () => {
    const page = await getLive(db.pages, pageId)
    if (!page.source) return
    const progress =
      patch.progress === undefined
        ? undefined
        : Math.min(1, Math.max(0, patch.progress))
    await db.pages.update(pageId, {
      source: {
        ...page.source,
        ...patch,
        ...(progress === undefined ? {} : { progress }),
      },
      // Not `updatedAt`: reading a book is not editing the page.
    })
  })
}
