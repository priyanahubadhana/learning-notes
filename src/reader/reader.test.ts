import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Annotation } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import {
  createAnnotation,
  deleteAnnotation,
  exportMarkdown,
  filterAnnotations,
  listAnnotations,
  locatorOf,
  makeQuote,
  reanchor,
  restoreAnnotation,
} from './annotations/annotationService'
import { deepLinkFor, ownHash } from './annotations/deepLink'
import { saveAnnotationTo } from './annotations/saveToNotes'
import { lookupUrl } from './annotations/colours'
import {
  capScale,
  fitWidthScale,
  flattenRects,
  groupRects,
  layoutPages,
  locatorAt,
  mergeRects,
  offsetForLocator,
  progressOf,
  toFractions,
  visibleRange,
} from './pdf/pdfLayout'

describe('PDF page column maths', () => {
  const sizes = Array.from({ length: 10 }, () => ({ w: 600, h: 800 }))
  const layout = layoutPages(sizes, 1)

  it('stacks pages and finds the visible band', () => {
    expect(layout.tops[0]).toBe(12)
    expect(layout.tops[1]).toBe(12 + 800 + 12)
    const [first, last] = visibleRange(layout, 0, 700, 0)
    expect(first).toBe(0)
    expect(last).toBe(0)
    const [f2, l2] = visibleRange(layout, 0, 700, 1)
    expect(f2).toBe(0)
    expect(l2).toBeGreaterThanOrEqual(1)
    expect(visibleRange(layoutPages([], 1), 0, 500)).toEqual([0, -1])
  })

  it('round-trips a reading position through the scroll offset', () => {
    const off = offsetForLocator(layout, 4, 0.25)
    const back = locatorAt(layout, off)
    expect(back.page).toBe(4)
    expect(back.y).toBeCloseTo(0.25, 3)
    expect(progressOf(4, 0.25, 10)).toBeCloseTo(0.325)
  })

  it('stays exact when the zoom changes (positions are fractions of the page)', () => {
    const zoomed = layoutPages(sizes, 2)
    const back = locatorAt(zoomed, offsetForLocator(zoomed, 7, 0.6))
    expect(back.page).toBe(7)
    expect(back.y).toBeCloseTo(0.6, 3)
  })

  it('fits width and caps canvas pixels', () => {
    expect(fitWidthScale(624, 600)).toBe(1)
    const scale = capScale(4, { w: 600, h: 800 }, 2)
    expect(600 * scale * 2 * (800 * scale * 2)).toBeLessThanOrEqual(16_700_001)
    expect(capScale(1, { w: 600, h: 800 }, 2)).toBe(1)
  })

  it('normalises and merges selection rectangles', () => {
    const box = { left: 100, top: 200, width: 500, height: 800 }
    const r = toFractions({ left: 150, top: 300, width: 250, height: 20 }, box)
    expect(r).toEqual([0.1, 0.125, 0.5, 0.025])
    const merged = mergeRects([
      [0.1, 0.1, 0.2, 0.02],
      [0.31, 0.1, 0.2, 0.02],
      [0.1, 0.2, 0.4, 0.02],
      [0.5, 0.5, 0.0001, 0.0001],
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0][2]).toBeCloseTo(0.41)
    expect(groupRects(flattenRects(merged))).toHaveLength(2)
  })
})

describe('annotations', () => {
  let db: LearningNotesDB
  let book: string
  beforeEach(async () => {
    db = createTestDb()
    await db.open()
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = await createNotebook(db, ws, 'Books')
    book = (await createPage(db, nb.id, null, 'Book')).id
  })
  afterEach(() => db.close())

  const make = (extra: Partial<Annotation> = {}) =>
    createAnnotation(db, {
      pageId: book,
      kind: 'highlight',
      colour: 'yellow',
      anchor: { type: 'pdf', page: 3, rects: [0.1, 0.2, 0.3, 0.02] },
      quote: { exact: 'Hello world', prefix: 'say ', suffix: ' again' },
      chapter: 'One',
      ...extra,
    } as never)

  it('creates, lists, deletes and restores', async () => {
    const a = await make()
    expect(await listAnnotations(db, book)).toHaveLength(1)
    await deleteAnnotation(db, a.id)
    expect(await listAnnotations(db, book)).toHaveLength(0)
    await restoreAnnotation(db, a.id)
    expect(await listAnnotations(db, book)).toHaveLength(1)
  })

  it('refuses a bad anchor and cuts overlong notes', async () => {
    await expect(
      make({ anchor: { type: 'pdf', page: 1, rects: [1, 2, 3] } }),
    ).rejects.toThrow()
    const a = await make({ note: 'x'.repeat(30_000) })
    expect(a.note?.length).toBe(20_000)
  })

  it('filters by type, colour and chapter', async () => {
    await make()
    await make({ kind: 'note', colour: 'pink', chapter: 'Two' })
    const all = await listAnnotations(db, book)
    expect(filterAnnotations(all, { type: 'note' })).toHaveLength(1)
    expect(filterAnnotations(all, { colour: 'yellow' })).toHaveLength(1)
    expect(
      filterAnnotations(all, { chapter: 'Two', colour: 'pink' }),
    ).toHaveLength(1)
    expect(filterAnnotations(all, {})).toHaveLength(2)
  })

  it('saves a highlight into the book page before the second heading, linked back', async () => {
    await createBlock(db, {
      pageId: book,
      type: 'heading',
      content: { level: 2, text: [] },
    })
    await createBlock(db, {
      pageId: book,
      type: 'paragraph',
      content: { text: [] },
    })
    await createBlock(db, {
      pageId: book,
      type: 'heading',
      content: { level: 2, text: [] },
    })
    const a = await make()
    await saveAnnotationTo(db, a, book, 'Page 3', 'highlights')
    const blocks = await listBlocks(db, book)
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'paragraph',
      'paragraph',
      'heading',
    ])
    expect(JSON.stringify(blocks[2].content)).toContain('Hello world')
    const row = await db.annotations.get(a.id)
    expect(row?.savedTo?.[0].pageId).toBe(book)
  })

  it('builds deep links the app catches', () => {
    const a: Pick<Annotation, 'pageId' | 'anchor'> = {
      pageId: 'p1',
      anchor: { type: 'pdf', page: 3, rects: [0.1, 0.25, 0.3, 0.02] },
    }
    expect(locatorOf(a.anchor)).toBe('pdf:3:0.2500')
    const link = deepLinkFor(a, 'https://app.example/')!
    expect(link).toBe('https://app.example/#/read/p1?at=pdf%3A3%3A0.2500')
    expect(ownHash(link, 'https://app.example/')).toBe(
      '#/read/p1?at=pdf%3A3%3A0.2500',
    )
    expect(
      ownHash('https://other.example/#/x', 'https://app.example/'),
    ).toBeNull()
    expect(
      deepLinkFor(
        { pageId: 'p2', anchor: { type: 'block', blockId: 'b' } },
        'https://a/',
      ),
    ).toBe('https://a/#/page/p2')
  })

  it('exports Markdown with quote, note, location and link', () => {
    const md = exportMarkdown(
      'Book',
      [
        {
          id: '1',
          pageId: 'p1',
          kind: 'highlight',
          anchor: { type: 'pdf', page: 3, rects: [0, 0.1, 1, 1] },
          quote: { exact: 'Hello', prefix: '', suffix: '' },
          note: 'My note',
          origin: 'user',
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      ],
      () => 'https://a/#/read/p1',
      { heading: 'Highlights from Book', location: (w) => `Location: ${w}` },
    )
    expect(md).toContain('# Highlights from Book')
    expect(md).toContain('> Hello')
    expect(md).toContain('My note')
    expect(md).toContain('Location: p. 3')
    expect(md).toContain('[↗](https://a/#/read/p1)')
  })
})

describe('re-anchoring by quote', () => {
  it('finds the words again after the text moved or changed around them', () => {
    const before = 'The cat sat on the mat. The dog sat on the mat.'
    const start = before.lastIndexOf('sat on the mat')
    const quote = makeQuote(before, start, start + 'sat on the mat'.length)
    const after = 'Intro added. ' + before.replace('The dog', 'A big dog')
    const at = reanchor(after, quote)
    expect(at).toBeGreaterThan(-1)
    expect(after.slice(at, at + 14)).toBe('sat on the mat')
    // The surroundings pick the right one of two equal phrases.
    expect(after.slice(at - 8, at)).toContain('dog')
    expect(reanchor('nothing here', quote)).toBe(-1)
  })
})

describe('look up', () => {
  it('builds web addresses for the selected word only', () => {
    expect(lookupUrl('dictionary', 'serendipity extra')).toBe(
      'https://en.wiktionary.org/wiki/serendipity',
    )
    expect(lookupUrl('wikipedia', 'a b')).toContain('search=a%20b')
    expect(lookupUrl('translate', 'x'.repeat(200)).length).toBeLessThan(200)
  })
})
