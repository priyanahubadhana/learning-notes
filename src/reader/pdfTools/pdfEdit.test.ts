/**
 * @vitest-environment jsdom
 */
import { PDFDocument } from 'pdf-lib'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import type { InkChunk, Stroke } from '../../core/inkTypes'
import { newRecordFields } from '../../core/records'
import { createTestDb } from '../../core/testing'
import type { Annotation } from '../../core/types'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { getBookFile, importBook } from '../../library/libraryService'
import {
  addTextLayer,
  applyPlan,
  combineFiles,
  flattenMarks,
  geoOf,
  linesAsWords,
  pageSizesOf,
  parseColour,
  picturesToPdf,
  toUser,
  wrapLines,
} from './pdfEdit'
import { applyPageEdit, undoPageEdit } from './pdfEditService'
import {
  identityPlan,
  insertBlank,
  movePage,
  removePages,
  turnPages,
} from './pageOps'

/** A PDF whose page i is (100 + i * 10) wide, so order can be read back. */
async function makePdf(n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 1; i <= n; i++) doc.addPage([100 + i * 10, 200])
  return doc.save()
}

const widths = async (bytes: Uint8Array | ArrayBuffer) =>
  (
    await PDFDocument.load(
      ArrayBuffer.isView(bytes) ? bytes : new Uint8Array(bytes),
    )
  )
    .getPages()
    .map((p) => p.getWidth())

const MSG = 'cannot open'

describe('pdf engine', () => {
  it('reorders, deletes, turns and adds pages', async () => {
    const src = await makePdf(4)
    let plan = movePage(identityPlan(4), 0, 3) // 2 3 4 1
    plan = removePages(plan, [1]) // 2 4 1
    plan = insertBlank(plan, 0) // 2 blank 4 1
    plan = turnPages(plan, [2], 90)
    const out = await applyPlan(src, plan, MSG)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(4)
    expect(doc.getPages().map((p) => p.getWidth())).toEqual([
      120, 120, 140, 110,
    ])
    // the blank page takes the size of its neighbour (page 2)
    expect(doc.getPage(1).getHeight()).toBe(200)
    expect(doc.getPage(2).getRotation().angle).toBe(90)
  })

  it('refuses a plan with no pages and a damaged file', async () => {
    await expect(applyPlan(await makePdf(1), [], MSG)).rejects.toThrow(MSG)
    await expect(
      applyPlan(new Uint8Array([1, 2, 3]), identityPlan(1), MSG),
    ).rejects.toThrow(MSG)
  })

  it('combines files in order', async () => {
    const out = await combineFiles([await makePdf(2), await makePdf(3)], MSG)
    expect(await widths(out)).toEqual([110, 120, 110, 120, 130])
  })

  it('extracts pages as a new file', async () => {
    const out = await applyPlan(
      await makePdf(5),
      [
        { from: 5, turn: 0 },
        { from: 2, turn: 0 },
      ],
      MSG,
    )
    expect(await widths(out)).toEqual([150, 120])
  })

  it('makes a PDF from pictures', async () => {
    // a 1x1 white JPEG
    const jpg = Uint8Array.from(
      atob(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      ),
      (c) => c.charCodeAt(0),
    )
    const out = await picturesToPdf(
      [{ jpeg: jpg, width: 1, height: 2 }],
      MSG,
      'Scan',
    )
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getPage(0).getHeight()).toBeCloseTo(595.28 * 2)
    expect(doc.getTitle()).toBe('Scan')
  })

  it('maps shown coordinates to PDF space for every turn', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([200, 100])
    const g = geoOf(page)
    expect(toUser(g, 0, 0)).toEqual({ x: 0, y: 100 }) // top-left
    page.setRotation({ type: 'degrees' as never, angle: 90 })
    const g90 = geoOf(page)
    expect(g90.rot).toBe(90)
    // shown page is 100 wide, 200 tall; its top-left is the user-space (0,0)
    expect(toUser(g90, 0, 0)).toEqual({ x: 0, y: 0 })
    expect(toUser(g90, 100, 0)).toEqual({ x: 0, y: 100 })
    page.setRotation({ type: 'degrees' as never, angle: 180 })
    expect(toUser(geoOf(page), 0, 0)).toEqual({ x: 200, y: 0 })
    page.setRotation({ type: 'degrees' as never, angle: 270 })
    expect(toUser(geoOf(page), 0, 0)).toEqual({ x: 200, y: 100 })
  })

  it('writes an invisible text layer and keeps the page count', async () => {
    const src = await makePdf(2)
    const out = await addTextLayer(
      src,
      new Map([
        [
          1,
          [
            { text: 'Hello', x0: 0.1, y0: 0.1, x1: 0.4, y1: 0.15 },
            { text: 'हिन्दी', x0: 0.5, y0: 0.1, x1: 0.7, y1: 0.15 },
          ],
        ],
      ]),
      MSG,
    )
    expect((await PDFDocument.load(out)).getPageCount()).toBe(2)
    expect(out.byteLength).toBeGreaterThan(src.byteLength)
  })

  it('spreads AI text as lines', () => {
    const words = linesAsWords('one\n\ntwo\nthree')
    expect(words.map((w) => w.text)).toEqual(['one', 'two', 'three'])
    expect(words[1]!.y0).toBeGreaterThan(words[0]!.y1 - 0.0001)
    expect(linesAsWords('  \n ')).toEqual([])
  })

  it('reads colours and wraps text', () => {
    expect(parseColour('#ff0000')).toEqual([1, 0, 0])
    expect(parseColour('#0f0')[1]).toBe(1)
    expect(parseColour('rgb(0, 0, 255)')).toEqual([0, 0, 1])
    expect(parseColour('nonsense')).toEqual([0, 0, 0])
    const font = { widthOfTextAtSize: (s: string) => s.length * 5 }
    expect(wrapLines(font, 'aaa bbb ccc', 10, 40)).toEqual(['aaa bbb', 'ccc'])
  })
})

const stroke = (): Stroke =>
  ({
    id: 's1',
    at: 0,
    kind: 'ink',
    style: { width: 2, colour: '#112233', opacity: 1, pen: 'ball' },
    pts: [0.1, 0.1, 1, 0, 0, 0, 0.5, 0.4, 1, 0, 0, 5],
    bw: 800,
  }) as unknown as Stroke

describe('flatten and keep marks in step', () => {
  let db: LearningNotesDB
  let pageId: string
  beforeEach(async () => {
    db = createTestDb()
    await db.open()
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const page = await importBook(
      db,
      ws,
      Object.assign(new Blob([(await makePdf(3)) as BlobPart]), {
        name: 'book.pdf',
      }),
      async () => ({ title: 'Book', pageCount: 3 }),
    )
    pageId = page.id
  })
  afterEach(() => db.close())

  const ann = (id: string, p: number, kind: Annotation['kind'] = 'highlight') =>
    ({
      ...newRecordFields(),
      id,
      pageId,
      kind,
      colour: 'yellow',
      anchor: { type: 'pdf', page: p, rects: [0.1, 0.1, 0.3, 0.05] },
      note: kind === 'note' ? 'Remember this' : undefined,
      origin: 'user',
    }) as Annotation
  const chunk = (id: string, block: string): InkChunk =>
    ({
      ...newRecordFields(),
      id,
      pageId,
      layerId: 'L',
      blockId: block,
      strokes: [stroke()],
    }) as InkChunk

  it('applies an edit, moves marks with their pages, and Undo restores all', async () => {
    await db.annotations.bulkAdd([
      ann('a1', 1),
      ann('a2', 2),
      ann('a3', 3, 'note'),
    ])
    await db.inkChunks.bulkAdd([chunk('c1', 'pdf:1'), chunk('c3', 'pdf:3')])
    const file = (await getBookFile(db, pageId))!
    const plan = removePages(movePage(identityPlan(3), 0, 2), [1]) // 2 3 1 -> page 3 at 2? see below
    // plan after move: [2,3,1]; removing index 1 drops old page 3 => [2,1]
    const sizes = await pageSizesOf(file.data, MSG)
    const bytes = await applyPlan(file.data, plan, MSG)
    const undo = await applyPageEdit(db, pageId, plan, sizes, bytes)

    const now = (await getBookFile(db, pageId))!
    expect(await widths(now.data)).toEqual([120, 110])
    const live = (await db.annotations.toArray()).filter((a) => !a.deletedAt)
    const pageOf = (id: string) =>
      (live.find((a) => a.id === id)?.anchor as { page: number } | undefined)
        ?.page
    expect(pageOf('a1')).toBe(2)
    expect(pageOf('a2')).toBe(1)
    expect(pageOf('a3')).toBeUndefined() // page 3 was deleted
    const chunks = (await db.inkChunks.toArray()).filter((c) => !c.deletedAt)
    expect(chunks.map((c) => [c.id, c.blockId])).toEqual([['c1', 'pdf:2']])
    expect((await db.pages.get(pageId))!.source!.pageCount).toBe(2)

    await undoPageEdit(db, undo)
    const back = (await getBookFile(db, pageId))!
    expect(await widths(back.data)).toEqual([110, 120, 130])
    const liveBack = (await db.annotations.toArray()).filter(
      (a) => !a.deletedAt,
    )
    expect(
      liveBack.map((a) => [a.id, (a.anchor as { page: number }).page]).sort(),
    ).toEqual([
      ['a1', 1],
      ['a2', 2],
      ['a3', 3],
    ])
    const inkBack = (await db.inkChunks.toArray()).filter((c) => !c.deletedAt)
    expect(inkBack.map((c) => c.blockId).sort()).toEqual(['pdf:1', 'pdf:3'])
    expect((await db.pages.get(pageId))!.source!.pageCount).toBe(3)
  })

  it('rolls back everything when the edit fails', async () => {
    await db.annotations.add(ann('a1', 1))
    const file = (await getBookFile(db, pageId))!
    const before = file.data.byteLength
    await expect(
      applyPageEdit(db, 'missing', identityPlan(3), [], new Uint8Array(2)),
    ).rejects.toThrow()
    expect((await getBookFile(db, pageId))!.data.byteLength).toBe(before)
    expect((await db.annotations.get('a1'))!.anchor).toMatchObject({ page: 1 })
  })

  it('flattens highlights, ink and notes onto the pages and adds a notes page', async () => {
    const file = (await getBookFile(db, pageId))!
    const clean = file.data.byteLength
    const out = await flattenMarks(
      file.data,
      {
        annotations: [ann('a1', 1), ann('a2', 2, 'note')],
        chunks: [chunk('c1', 'pdf:1'), chunk('c9', 'pdf:99')],
        labels: { notes: 'Notes', page: 'Page' },
      },
      MSG,
    )
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(4) // 3 pages + the notes page
    expect(out.byteLength).toBeGreaterThan(clean)
  })

  it('leaves a file with no marks the same length in pages', async () => {
    const file = (await getBookFile(db, pageId))!
    const out = await flattenMarks(
      file.data,
      { annotations: [], chunks: [], labels: { notes: 'Notes', page: 'Page' } },
      MSG,
    )
    expect((await PDFDocument.load(out)).getPageCount()).toBe(3)
  })
})
