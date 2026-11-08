import { describe, expect, it } from 'vitest'
import { frameOf, toLocal, toWorld } from '../ink/anchor'
import { OFF_SCREEN_Y, PageLayout, type BookSurface } from '../ink/layout'
import { epubBlockId, epubBlockOf, blockIn } from './epub/epubInk'
import { pageBlock, pdfBlockId, pdfPageOf } from './pdf/pdfInk'

/** C2b: ink anchors of book pages (pure parts; the readers are in e2e/bookInk). */

describe('PDF page anchors', () => {
  it('makes and reads page ids', () => {
    expect(pdfBlockId(7)).toBe('pdf:7')
    expect(pdfPageOf('pdf:7')).toBe(7)
    expect(pdfPageOf('epub:1:2')).toBe(0)
    expect(pdfPageOf(null)).toBe(0)
    expect(pdfPageOf('pdf:abc')).toBe(0)
  })

  it('measures a page from the wrap corner', () => {
    const b = pageBlock(
      2,
      { left: 120, top: 900, width: 600, height: 800 },
      { left: 20, top: 100 },
    )
    expect(b).toEqual({ id: 'pdf:2', x: 100, y: 800, w: 600, h: 800 })
  })

  it('a stroke keeps its place on the page when the zoom doubles', () => {
    // A point 0.25 page widths right and 0.5 down from the page corner.
    const saved = { x: 0.25, y: 0.5 }
    const at = (w: number) =>
      toWorld(saved, frameOf({ id: 'p', x: 40, y: 1000, w, h: w * 1.3 }, w))
    const one = at(600)
    const two = at(1200)
    expect((one.x - 40) / 600).toBeCloseTo((two.x - 40) / 1200)
    expect((one.y - 1000) / 600).toBeCloseTo((two.y - 1000) / 1200)
    // And the way back is exact.
    const local = toLocal(
      two,
      frameOf({ id: 'p', x: 40, y: 1000, w: 1200, h: 1 }, 1200),
    )
    expect(local.x).toBeCloseTo(0.25)
    expect(local.y).toBeCloseTo(0.5)
  })
})

describe('EPUB paragraph anchors', () => {
  it('makes and reads paragraph ids', () => {
    expect(epubBlockId(3, 12)).toBe('epub:3:12')
    expect(epubBlockOf('epub:3:12')).toEqual({ section: 3, n: 12 })
    expect(epubBlockOf('pdf:3')).toBeNull()
    expect(epubBlockOf('epub:x:1')).toBeNull()
    expect(epubBlockOf(null)).toBeNull()
  })

  it('places a paragraph from its frame and the wrap, skipping empty ones', () => {
    const b = blockIn(
      'epub:0:1',
      { left: 10, top: 50, width: 300, height: 40 },
      { left: 100, top: 200 },
      { left: 90, top: 150 },
    )
    expect(b).toEqual({ id: 'epub:0:1', x: 20, y: 100, w: 300, h: 40 })
    expect(
      blockIn(
        'epub:0:2',
        { left: 0, top: 0, width: 0, height: 10 },
        { left: 0, top: 0 },
        { left: 0, top: 0 },
      ),
    ).toBeNull()
  })
})

describe('PageLayout over a book', () => {
  const wrap = {
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 3000,
    }),
  } as unknown as HTMLElement
  const pages = [
    { id: 'pdf:1', x: 100, y: 0, w: 600, h: 800 },
    { id: 'pdf:2', x: 100, y: 820, w: 600, h: 800 },
  ]
  const surface: BookSurface = { blocks: () => pages, unit: () => 600 }

  it('uses the surface blocks and the page width as the unit', () => {
    const layout = new PageLayout(wrap, () => undefined, surface)
    layout.measure()
    expect(layout.width).toBe(600)
    expect(layout.blocks().map((b) => b.id)).toEqual(['pdf:1', 'pdf:2'])
    expect(layout.frame('pdf:2')).toEqual({ x: 100, y: 820, w: 600 })
  })

  it('draws a block that is not on screen far away, never on another block', () => {
    const layout = new PageLayout(
      wrap,
      () => ({ x: 0, y: 50, w: 600 }),
      surface,
    )
    layout.measure()
    expect(layout.frame('pdf:9').y).toBe(OFF_SCREEN_Y)
  })

  it('reports a change when a page moves', () => {
    const layout = new PageLayout(wrap, () => undefined, surface)
    expect(layout.measure()).toBe(true)
    expect(layout.measure()).toBe(false)
    pages[1] = { ...pages[1], y: 1000 }
    expect(layout.measure()).toBe(true)
    pages[1] = { ...pages[1], y: 820 }
  })
})
