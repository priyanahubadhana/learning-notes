// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'
import {
  expectStrokes,
  inkClientBox,
  line,
  savedInk,
  stroke,
} from './inkHelpers.ts'

/**
 * C2b: ink on the pages of the PDF and EPUB readers, driven by simulated
 * mouse events (a mouse always draws). The ink is kept per page / paragraph.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openBook(
  page: Page,
  name: string,
  mimeType: string,
  buffer: Buffer,
) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page
    .getByTestId('library-file')
    .setInputFiles({ name, mimeType, buffer })
  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

const openPdf = (page: Page) =>
  openBook(
    page,
    'fixture.pdf',
    'application/pdf',
    makePdf(['Alpha page words', 'Bravo page words', 'Charlie page words'], {
      title: 'Ink Book',
    }),
  )

/** Where page n is on screen. */
const pageRect = (page: Page, n: number) =>
  page.locator(`[data-pdf-page="${n}"]`).evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

/** The painted pixels of the ink canvases, as a box in client px (or null). */
const inkBox = async (page: Page) => {
  const b = await inkClientBox(page, 40)
  return b && { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 }
}

async function showPage(page: Page, n: number) {
  await expect(page.locator(`[data-pdf-page="${n}"]`)).toBeAttached()
  await page.getByTestId('pdf-scroller').evaluate((el, i) => {
    const target = el.querySelector<HTMLElement>(`[data-pdf-page="${i}"]`)!
    el.scrollTop = target.offsetTop - 20
  }, n)
  // 300, not 260: the frame gaps of design step 2 push the page down about 24 px.
  await expect.poll(async () => (await pageRect(page, n)).y).toBeLessThan(300)
}

test('a pen stroke on page 2 stays on page 2 after zoom and reload', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
  await showPage(page, 2)
  const r = await pageRect(page, 2)
  await stroke(
    page,
    line([r.x + r.w * 0.2, r.y + 120], [r.x + r.w * 0.7, r.y + 160]),
    { type: 'mouse' },
  )
  await expectStrokes(page, 1)
  const ink = await savedInk(page)
  expect(ink.chunks[0].blockId).toBe('pdf:2')

  const before = await inkBox(page)
  expect(before).not.toBeNull()
  const f0 = { x: (before!.x - r.x) / r.w, w: before!.w / r.w }

  // Zoom in: the stroke scales with the page (same place on the page).
  await page.getByTestId('reader-ink-done').click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByRole('button', { name: 'Fit width' })).toHaveText(
    '125%',
  )
  await showPage(page, 2)
  await expect
    .poll(async () => {
      const r2 = await pageRect(page, 2)
      const b = await inkBox(page)
      if (!b) return 'none'
      const f1 = { x: (b.x - r2.x) / r2.w, w: b.w / r2.w }
      return Math.abs(f1.x - f0.x) < 0.02 && Math.abs(f1.w - f0.w) < 0.02
    })
    .toBe(true)

  // It is still there after a reload, on the same page.
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await showPage(page, 2)
  await expect.poll(() => inkBox(page)).not.toBeNull()
  expect((await savedInk(page)).chunks[0].blockId).toBe('pdf:2')
})

test('a stroke on page 3 is saved against page 3; Undo and Redo work', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-ink').click()
  await showPage(page, 3)
  const r = await pageRect(page, 3)
  await stroke(
    page,
    line([r.x + r.w * 0.2, r.y + 100], [r.x + r.w * 0.6, r.y + 100]),
    { type: 'mouse' },
  )
  await expectStrokes(page, 1)
  expect((await savedInk(page)).chunks[0].blockId).toBe('pdf:3')
  await page.getByTestId('reader-ink-undo').click()
  await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(0)
  await page.getByTestId('reader-ink-redo').click()
  await expectStrokes(page, 1)
})

test('with the Pen off the pad lets text selection through', async ({
  page,
}) => {
  await openPdf(page)
  await expect(page.locator('[data-ink-pad]')).toHaveCSS(
    'pointer-events',
    'none',
  )
  await page.getByTestId('reader-ink').click()
  await expect(page.locator('[data-ink-pad]')).toHaveCSS(
    'pointer-events',
    'auto',
  )
  await page.getByTestId('reader-ink-done').click()
  await expect(page.locator('[data-ink-pad]')).toHaveCSS(
    'pointer-events',
    'none',
  )
})

test('EPUB: ink is anchored to its paragraph; Pages mode points to Scroll', async ({
  page,
}) => {
  await openBook(
    page,
    'story.epub',
    'application/epub+zip',
    makeEpub('The Story'),
  )
  await expect(page.getByTestId('epub-ink-wrap')).toBeAttached()
  // Pages mode cannot hold ink.
  await page.getByTestId('epub-flow').click()
  await page.getByTestId('reader-ink').click()
  await expect(page.getByText('Drawing works in Scroll mode')).toBeVisible()
  await expect(page.getByTestId('reader-ink-bar')).toHaveCount(0)
  await page.getByTestId('epub-flow').click() // back to Scroll
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()

  // The paragraph's screen place, from the frame that holds the chapter.
  const box = async () => {
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue
      const p = await f
        .evaluate(() => {
          const el = document.querySelector('p')
          if (!el || !el.textContent?.includes('quick brown fox')) return null
          const r = el.getBoundingClientRect()
          const fr = window.frameElement!.getBoundingClientRect()
          return { x: fr.x + r.x, y: fr.y + r.y, w: r.width, h: r.height }
        })
        .catch(() => null)
      if (p) return p
    }
    return null
  }
  await expect.poll(box).not.toBeNull()
  const p0 = (await box())!
  await stroke(
    page,
    line([p0.x + 10, p0.y + p0.h + 6], [p0.x + 200, p0.y + p0.h + 6]),
    { type: 'mouse' },
  )
  await expectStrokes(page, 1)
  const ink = await savedInk(page)
  expect(ink.chunks[0].blockId).toMatch(/^epub:\d+:\d+$/)
  expect(await inkBox(page)).not.toBeNull()

  // The text gets bigger: the paragraph reflows and the ink follows it.
  await page.getByTestId('reader-ink-done').click()
  await page.getByTestId('epub-larger').click()
  await page.getByTestId('epub-larger').click()
  await expect.poll(async () => (await box())!.h).toBeGreaterThan(p0.h)
  await expect
    .poll(async () => {
      const b = await inkBox(page)
      const p = await box()
      if (!b || !p) return 'none'
      // Same paragraph still: the ink sits just under its text.
      return b.y > p.y && b.y < p.y + p.h + 60
    })
    .toBe(true)
  expect((await savedInk(page)).chunks[0].blockId).toBe(ink.chunks[0].blockId)
})
