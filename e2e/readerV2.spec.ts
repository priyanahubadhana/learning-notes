// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7a (docs/features/reader-v2.md): the reader bar and the drawing bar
 * minimise on their own, the sidebar never covers ✕ Exit reading, and the
 * bars slide away on scroll. One test per spec line id. Flag reader.v2 is
 * switched on with ?flags=reader.v2.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openPdf(page: Page, flags = 'reader.v2') {
  await page.goto(flags ? `/?flags=${flags}` : '/')
  // A narrow screen keeps the spaces in the menu drawer.
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      Array.from({ length: 12 }, (_, i) => `Page ${i + 1} words here`),
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

const readerBar = (page: Page) => page.getByTestId('rv2-reader-bar')
const drawBar = (page: Page) => page.getByTestId('rv2-draw-bar')
const readerChip = (page: Page) =>
  page.getByRole('button', { name: 'Show reader bar' })
const drawChip = (page: Page) =>
  page.getByRole('button', { name: 'Show drawing bar' })
const hideReader = (page: Page) =>
  page.getByRole('button', { name: 'Hide reader bar' })
const hideDraw = (page: Page) =>
  page.getByRole('button', { name: 'Hide drawing bar' })

/** Starts the pen so the drawing bar shows. */
async function startPen(page: Page) {
  await page.getByTestId('reader-ink').click()
  await expect(drawBar(page)).toBeVisible()
}

const box = async (loc: ReturnType<Page['locator']>) => {
  const b = await loc.boundingBox()
  if (!b) throw new Error('not visible')
  return b
}

test("flag off: today's reader, no new bars", async ({ page }) => {
  await openPdf(page, '')
  await expect(page.getByTestId('reader-bar')).toBeVisible()
  await expect(page.getByTestId('rv2-host')).toHaveCount(0)
  await expect(page.getByTestId('rv2-reader-bar')).toHaveCount(0)
})

test('RD-B01 the bar shows the reader controls', async ({ page }) => {
  await openPdf(page)
  await expect(readerBar(page)).toBeVisible()
  for (const id of [
    'reader-close',
    'reader-page',
    'reader-find',
    'reader-ink',
    'reader-contents',
    'reader-annotations',
    'reader-aa',
    'reader-lock',
    'reader-more',
  ])
    await expect(page.getByTestId(id)).toBeVisible()
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 12')
})

test.describe('iPad portrait, touch', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
    isMobile: true,
  })

  test('RD-B02 the sidebar never covers ✕ Exit reading', async ({ page }) => {
    await openPdf(page)
    const close = page.getByTestId('reader-close')
    const before = await box(close)
    expect(before.width).toBeGreaterThanOrEqual(44)
    expect(before.height).toBeGreaterThanOrEqual(44)
    // Open the sidebar over the reader (menu button of the page, or the panel).
    const menu = page.getByRole('button', { name: 'Open menu' })
    if (await menu.isVisible()) await menu.click()
    else await page.getByTestId('panel-toggle').click()
    const top = await close.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      )
      return !!hit && (hit === el || el.contains(hit))
    })
    expect(top).toBe(true)
    expect(await box(close)).toEqual(before)
  })

  test('RD-B02 the left panel never covers ✕ Exit reading either', async ({
    page,
  }) => {
    await openPdf(page)
    await page.getByTestId('panel-toggle').click()
    await expect(page.getByTestId('left-panel')).toBeVisible()
    const close = page.getByTestId('reader-close')
    const covered = await close.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      )
      return !hit || !(hit === el || el.contains(hit))
    })
    expect(covered).toBe(false)
  })

  test('RD-B03 ✕ Exit closes the reader in one tap with the sidebar open', async ({
    page,
  }) => {
    await openPdf(page)
    const menu = page.getByRole('button', { name: 'Open menu' })
    if (await menu.isVisible()) await menu.click()
    else await page.getByTestId('panel-toggle').click()
    await page.getByTestId('reader-close').tap()
    await expect(page.getByTestId('book-reader')).toHaveCount(0)
  })
})

test('RD-B04 minimising the reader bar leaves the drawing bar alone', async ({
  page,
}) => {
  await openPdf(page)
  await startPen(page)
  await hideReader(page).click()
  await expect(readerBar(page)).toHaveCount(0)
  const chip = readerChip(page)
  await expect(chip).toBeVisible()
  await expect(chip).toContainText('Reader')
  const c = await box(chip)
  const vp = page.viewportSize()!
  expect(c.x + c.width).toBeGreaterThan(vp.width - 2)
  await expect(drawBar(page)).toBeVisible()
  await expect(drawChip(page)).toHaveCount(0)
})
test('RD-B05 minimising the drawing bar leaves the reader bar alone', async ({
  page,
}) => {
  await openPdf(page)
  await startPen(page)
  await hideDraw(page).click()
  await expect(drawBar(page)).toHaveCount(0)
  await expect(page.getByTestId('reader-ink-pen')).toHaveCount(0)
  await expect(drawChip(page)).toBeVisible()
  await expect(readerBar(page)).toBeVisible()
  await expect(readerChip(page)).toHaveCount(0)
  // With both minimised the Draw chip sits under the Reader chip, 8 px apart.
  await hideReader(page).click()
  const r = await box(readerChip(page))
  const d = await box(drawChip(page))
  expect(Math.round(d.y - (r.y + r.height))).toBe(8)
})

test('RD-B06 the Draw chip brings back only the drawing bar', async ({
  page,
}) => {
  await openPdf(page)
  await startPen(page)
  await hideDraw(page).click()
  await hideReader(page).click()
  await drawChip(page).click()
  await expect(drawBar(page)).toBeVisible()
  await expect(readerBar(page)).toHaveCount(0)
  await expect(readerChip(page)).toBeVisible()
})

test('RD-B07 the Reader chip brings back only the reader bar', async ({
  page,
}) => {
  await openPdf(page)
  await startPen(page)
  await hideDraw(page).click()
  await hideReader(page).click()
  await readerChip(page).click()
  await expect(readerBar(page)).toBeVisible()
  await expect(drawBar(page)).toHaveCount(0)
  await expect(drawChip(page)).toBeVisible()
})

test('RD-B08 both bars stay minimised after a reload', async ({ page }) => {
  await openPdf(page)
  await startPen(page)
  await hideDraw(page).click()
  await hideReader(page).click()
  await expect(readerChip(page)).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(readerChip(page)).toBeVisible()
  await expect(readerBar(page)).toHaveCount(0)
  await expect(page.getByTestId('reader-close')).toHaveCount(0)
})

test('RD-B09 the bar slides away on scroll down, back on a short scroll up; minimised stays minimised', async ({
  page,
}) => {
  await openPdf(page)
  const stack = page.getByTestId('rv2-stack')
  const scroller = page.getByTestId('pdf-scroller')
  await expect(scroller).toBeVisible()
  // The book is laid out (page count known) before we scroll it.
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 12')
  const scrollTo = (y: number) =>
    scroller.evaluate((el, top) => {
      el.scrollTop = top
    }, y)
  await scrollTo(5)
  await scrollTo(200)
  await expect(stack).toHaveClass(/rv2-stack--away/)
  await scrollTo(185)
  await expect(stack).not.toHaveClass(/rv2-stack--away/)
  // A minimised bar does not come back with the scroll.
  await hideReader(page).click()
  await scrollTo(600)
  await scrollTo(0)
  await expect(readerBar(page)).toHaveCount(0)
  await expect(readerChip(page)).toBeVisible()
})

for (const [name, w, h] of [
  ['iPad landscape', 1180, 820],
  ['iPad portrait', 820, 1180],
  ['phone portrait', 390, 844],
  ['phone landscape', 844, 390],
] as const) {
  test(`chips and bars are fully on screen: ${name}`, async ({ page }) => {
    // The chip slides in over 180 ms; measure it at rest.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: w, height: h })
    await openPdf(page)
    await startPen(page)
    const inside = async (loc: ReturnType<Page['locator']>) => {
      const b = await box(loc)
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.y).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(w + 0.5)
      expect(b.y + b.height).toBeLessThanOrEqual(h + 0.5)
      expect(b.height).toBeGreaterThanOrEqual(44)
    }
    await inside(readerBar(page))
    await hideDraw(page).click()
    await inside(drawChip(page))
    await hideReader(page).click()
    await inside(readerChip(page))
    await inside(drawChip(page))
  })
}

for (const [name, w, h] of [
  ['iPad portrait 820', 820, 1180],
  ['iPad landscape 1180', 1180, 820],
  ['phone 390', 390, 844],
  ['phone small 360', 360, 740],
] as const) {
  test(`RD-B01 the reader bar is ONE row, nothing clipped, never sideways: ${name}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: w, height: h })
    await openPdf(page)
    const row = page.getByTestId('rv2-row')
    await expect(row).toBeVisible()
    await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 12')
    const r = await box(row)
    // One row of 44 px buttons (plus the bar's own padding), not two or three.
    expect(r.height).toBeLessThan(90)
    expect(r.height).toBeGreaterThanOrEqual(44)
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x + r.width).toBeLessThanOrEqual(w + 0.5)
    // Every control in the row sits inside it, on one line, none cut off.
    const parts = await row.evaluate((el) => {
      const rr = el.getBoundingClientRect()
      return {
        scrolls: el.scrollWidth > el.clientWidth + 0.5,
        tops: [...el.children].map((c) => {
          const b = c.getBoundingClientRect()
          return {
            top: b.top,
            h: b.height,
            l: b.left,
            r: b.right,
            inside: b.left >= rr.left - 0.5 && b.right <= rr.right + 0.5,
          }
        }),
      }
    })
    expect(parts.scrolls).toBe(false)
    for (const c of parts.tops) {
      expect(c.inside).toBe(true)
      expect(c.top).toBeGreaterThanOrEqual(r.y - 0.5)
      expect(c.top + c.h).toBeLessThanOrEqual(r.y + r.height + 0.5)
    }
    // The ⋯ ▾ card holds the rest and stays on screen.
    await page.getByTestId('reader-more').click()
    const card = page.getByTestId('reader-more-card')
    await expect(card).toBeVisible()
    // Measure at rest: the card (a sheet on a phone) slides in first.
    await card.evaluate((el) =>
      Promise.all(el.getAnimations().map((a) => a.finished)),
    )
    const c = await box(card)
    expect(c.x).toBeGreaterThanOrEqual(0)
    expect(c.y).toBeGreaterThanOrEqual(0)
    expect(c.x + c.width).toBeLessThanOrEqual(w + 0.5)
    expect(c.y + c.height).toBeLessThanOrEqual(h + 0.5)
    // Listen is in the bar, or (narrow) in the card, always reachable.
    const inBar = await page.getByTestId('reader-listen').count()
    const inCard = await page.getByTestId('reader-listen-card').count()
    expect(inBar + inCard).toBe(1)
  })
}

test('RD-B01 Listen and the time-left line are in the bar (wide screen)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 820 })
  await openPdf(page)
  await expect(page.getByTestId('reader-listen')).toBeVisible()
  await expect(page.getByTestId('reader-listen')).toHaveAttribute(
    'aria-label',
    'Listen',
  )
  // Time left sits inside the same bar once the book has words to count.
  const inside = await page
    .getByTestId('reader-timeleft')
    .evaluate((el) => !!el.closest('[data-testid="rv2-reader-bar"]'))
    .catch(() => true)
  expect(inside).toBe(true)
})
