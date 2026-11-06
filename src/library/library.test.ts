/**
 * @vitest-environment jsdom
 */
import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks } from '../core/blockService'
import {
  detectBookFormat,
  isBigBook,
  MAX_BOOK_BYTES,
  megabytes,
} from '../core/bookFormat'
import type { LearningNotesDB } from '../core/db'
import { isHttpsUrl, isPageSource, parseLocator } from '../core/sourceCheck'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { listChildPages } from '../pages/pageService'
import { splitAtHeading1 } from './docxPages'
import {
  LibraryError,
  getBookFile,
  importBook,
  listSources,
  progressPercent,
  readStatus,
  saveProgress,
  type BookInspector,
} from './libraryService'

const pdfBytes = () => strToU8('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF')
const epubBytes = () =>
  zipSync({
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8('<container/>'),
  })
const docxBytes = () =>
  zipSync({ 'word/document.xml': strToU8('<w:document/>') })

let db: LearningNotesDB
let ws: string
beforeEach(async () => {
  db = createTestDb()
  await db.open()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(() => db.close())

const inspect: BookInspector = async (format, _bytes, name) => ({
  title: name.replace(/\.\w+$/, ''),
  author: 'A. Writer',
  pageCount: format === 'pdf' ? 12 : undefined,
  docxHtml:
    format === 'docx'
      ? '<p>Intro words</p><h1>One</h1><p>Alpha</p><h2>Part</h2><p>Beta</p><h1>Two</h1><ul><li>x</li></ul>'
      : undefined,
})

const file = (bytes: Uint8Array, name: string) =>
  Object.assign(new Blob([bytes as BlobPart]), { name })

describe('book format detection', () => {
  it('tells PDF, EPUB and DOCX apart by their bytes', () => {
    expect(detectBookFormat(pdfBytes())).toBe('pdf')
    expect(detectBookFormat(epubBytes())).toBe('epub')
    expect(detectBookFormat(docxBytes())).toBe('docx')
  })
  it('refuses other files, whatever they are called', () => {
    expect(detectBookFormat(strToU8('hello'))).toBeNull()
    expect(detectBookFormat(zipSync({ 'a.txt': strToU8('x') }))).toBeNull()
    expect(
      detectBookFormat(
        zipSync({
          mimetype: strToU8('application/zip'),
          'a.txt': strToU8('x'),
        }),
      ),
    ).toBeNull()
  })
})

describe('source checks', () => {
  it('accepts https addresses only', () => {
    expect(isHttpsUrl('https://example.com/a?b=1')).toBe(true)
    expect(isHttpsUrl('http://example.com')).toBe(false)
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpsUrl('https://' + 'a'.repeat(2100))).toBe(false)
  })
  it('validates Page.source field by field', () => {
    expect(isPageSource({ kind: 'book', format: 'pdf', progress: 0.5 })).toBe(
      true,
    )
    expect(isPageSource({ kind: 'video', url: 'http://x.com' })).toBe(false)
    expect(isPageSource({ kind: 'nope' })).toBe(false)
    expect(isPageSource({ kind: 'book', progress: 2 })).toBe(false)
    expect(isPageSource({ kind: 'book', surprise: 1 })).toBe(false)
    expect(isPageSource({ kind: 'book', at: 'pdf:3:0.25' })).toBe(true)
    expect(isPageSource({ kind: 'book', at: 'bogus' })).toBe(false)
  })
  it('parses locators', () => {
    expect(parseLocator('pdf:12:0.5')).toEqual({
      type: 'pdf',
      page: 12,
      y: 0.5,
    })
    expect(parseLocator('pdf:0:0.5')).toBeNull()
    expect(parseLocator('pdf:2:1.5')).toBeNull()
    expect(parseLocator('epub:epubcfi(/6/4)')).toEqual({
      type: 'epub',
      cfi: 'epubcfi(/6/4)',
    })
    expect(parseLocator('epub:')).toBeNull()
  })
})

describe('importBook', () => {
  it('makes the Books notebook once and a book page with its file and sections', async () => {
    const a = await importBook(db, ws, file(pdfBytes(), 'First.pdf'), inspect)
    const b = await importBook(db, ws, file(pdfBytes(), 'Second.pdf'), inspect)
    const books = (await db.notebooks.toArray()).filter(
      (n) => n.kind === 'books',
    )
    expect(books).toHaveLength(1)
    expect(a.notebookId).toBe(b.notebookId)
    expect(a.source).toMatchObject({
      kind: 'book',
      format: 'pdf',
      author: 'A. Writer',
      pageCount: 12,
      progress: 0,
    })
    const stored = await getBookFile(db, a.id)
    expect(stored?.mime).toBe('application/pdf')
    expect(stored?.data.byteLength).toBeGreaterThan(10)
    const blocks = await listBlocks(db, a.id)
    expect(blocks.filter((x) => x.type === 'heading')).toHaveLength(3)
  })

  it('refuses a file of the wrong kind and one that is too big', async () => {
    await expect(
      importBook(db, ws, file(strToU8('not a book'), 'x.pdf'), inspect),
    ).rejects.toBeInstanceOf(LibraryError)
    const huge = {
      size: MAX_BOOK_BYTES + 1,
      name: 'huge.pdf',
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Blob
    await expect(importBook(db, ws, huge, inspect)).rejects.toThrow(/300 MB/)
    expect(await db.pages.count()).toBe(0)
  })

  it('turns a DOCX into a chapter page tree that opens locked to reading', async () => {
    const book = await importBook(
      db,
      ws,
      file(docxBytes(), 'Doc.docx'),
      inspect,
    )
    expect(book.readFirst).toBe(true)
    const chapters = await listChildPages(db, book.notebookId, book.id)
    expect(chapters.map((c) => c.title)).toEqual(['Beginning', 'One', 'Two'])
    expect(chapters.every((c) => c.readFirst)).toBe(true)
    const one = await listBlocks(db, chapters[1].id)
    expect(one.map((b) => b.type)).toEqual([
      'paragraph',
      'heading',
      'paragraph',
    ])
  })

  it('splits blocks at Heading 1', () => {
    const chapters = splitAtHeading1(
      [
        { type: 'paragraph', content: {} },
        {
          type: 'heading',
          content: {
            level: 1,
            text: [{ type: 'text', text: 'A', styles: {} }],
          },
        },
        { type: 'paragraph', content: {} },
      ],
      'Start',
    )
    expect(chapters.map((c) => [c.title, c.blocks.length])).toEqual([
      ['Start', 1],
      ['A', 1],
    ])
  })
})

describe('the Library list and progress', () => {
  it('lists books newest-read first and filters by kind', async () => {
    const a = await importBook(db, ws, file(pdfBytes(), 'A.pdf'), inspect, 1000)
    const b = await importBook(
      db,
      ws,
      file(epubBytes(), 'B.epub'),
      inspect,
      2000,
    )
    expect((await listSources(db, ws)).map((p) => p.id)).toEqual([b.id, a.id])
    await saveProgress(db, a.id, { openedAt: 5000 })
    expect((await listSources(db, ws)).map((p) => p.id)).toEqual([a.id, b.id])
    expect(await listSources(db, ws, 'videos')).toEqual([])
    expect(await listSources(db, ws, 'books')).toHaveLength(2)
  })

  it('saves clamped progress and a locator', async () => {
    const a = await importBook(db, ws, file(pdfBytes(), 'A.pdf'), inspect)
    await saveProgress(db, a.id, { progress: 1.7, at: 'pdf:3:0.2500' })
    const page = await db.pages.get(a.id)
    expect(page?.source?.progress).toBe(1)
    expect(page?.source?.at).toBe('pdf:3:0.2500')
    expect(readStatus(page?.source)).toBe('finished')
    expect(progressPercent(page?.source)).toBe(100)
    expect(readStatus({ kind: 'book' })).toBe('new')
    expect(readStatus({ kind: 'book', progress: 0.3 })).toBe('reading')
  })
})

describe('big files', () => {
  it('warns above 200 MB, not at 200 MB, and still imports up to the limit', () => {
    expect(isBigBook(200 * 1024 * 1024)).toBe(false)
    expect(isBigBook(200 * 1024 * 1024 + 1)).toBe(true)
    expect(isBigBook(MAX_BOOK_BYTES)).toBe(true)
  })

  it('shows the size in whole megabytes', () => {
    expect(megabytes(42 * 1024 * 1024)).toBe(42)
    expect(megabytes(10)).toBe(1)
  })
})
