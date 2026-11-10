/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'

// Items 29, 32, 44, 45: the left panel follows the open book, Kindle-style
// full screen, double-tap zoom with an overview, Go to, furthest page.

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openBook(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  await page.goto('/')
  // A narrow screen (iPad portrait) keeps the spaces in the menu drawer.
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles(file)
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

const openPdf = (page: Page) =>
  openBook(page, {
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      ['Alpha page words here', 'Bravo page words here', 'Charlie page words'],
      { title: 'Fixture Book' },
    ),
  })

test('the left panel shows the book while the reader is open', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('panel-toggle').click()
  const thumbs = page.getByTestId('book-thumb')
  await expect(thumbs).toHaveCount(3)
  await expect(thumbs.nth(0)).toHaveAttribute('aria-current', 'page')
  await thumbs.nth(2).click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 3')
  await expect(thumbs.nth(2)).toHaveAttribute('aria-current', 'page')
  // Notes tab: a bookmark from the ribbon shows there and jumps back.
  await page.getByTestId('reader-ribbon').click()
  await page
    .getByTestId('left-panel')
    .getByRole('tab', { name: 'Notes' })
    .click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(1)
  await thumbsTab(page, 'Pages')
  await thumbs.nth(0).click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 3')
  await page
    .getByTestId('left-panel')
    .getByRole('tab', { name: 'Notes' })
    .click()
  await page.getByTestId('annotation-row').getByRole('button').first().click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 3')
  // Closing the reader gives the note's own tabs back.
  await page.getByTestId('reader-close').click()
  await expect(page.getByTestId('book-thumbs')).toHaveCount(0)
})

const thumbsTab = (page: Page, name: string) =>
  page.getByTestId('left-panel').getByRole('tab', { name }).click()

test('an EPUB lists its chapters in the left panel', async ({ page }) => {
  await openBook(page, {
    name: 'story.epub',
    mimeType: 'application/epub+zip',
    buffer: makeEpub('The Story'),
  })
  await page.getByTestId('panel-toggle').click()
  await expect(page.getByTestId('book-chapters')).toBeVisible()
  await expect(
    page.getByTestId('book-chapters').getByRole('button'),
  ).not.toHaveCount(0)
})

test('Go to page and Sync to furthest page read', async ({ page }) => {
  await openPdf(page)
  await page.getByTestId('reader-more').click()
  await page.getByRole('menuitem', { name: /Go to page/ }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('3')
  await page.getByRole('dialog').getByRole('button', { name: 'Go' }).click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 3')
  // Reading progress is saved after a still moment.
  await page.waitForTimeout(2600)
  await page.getByTestId('reader-more').click()
  await page.getByRole('menuitem', { name: /Go to page/ }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('1')
  await page.getByRole('dialog').getByRole('button', { name: 'Go' }).click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 3')
  await page.getByTestId('reader-more').click()
  await page.getByRole('menuitem', { name: /Sync to furthest/ }).click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 3')
})

test('full screen shows only the text; edges turn pages; the middle shows the bar', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-fullscreen').click()
  await expect(page.getByTestId('reader-bar')).toBeHidden()
  await expect(page.getByTestId('reader-fs-title')).toContainText(
    'Fixture Book',
  )
  await expect(page.getByTestId('reader-fs-progress')).toContainText(
    'Page 1 of 3',
  )
  const box = (await page.getByTestId('book-reader').boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.click(box.x + box.width * 0.95, y)
  await expect(page.getByTestId('reader-fs-progress')).toContainText(
    'Page 2 of 3',
  )
  await page.mouse.click(box.x + box.width * 0.05, y)
  await expect(page.getByTestId('reader-fs-progress')).toContainText(
    'Page 1 of 3',
  )
  await page.mouse.click(box.x + box.width * 0.5, y)
  await expect(page.getByTestId('reader-bar')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('reader-fs-title')).toHaveCount(0)
  await expect(page.getByTestId('reader-bar')).toBeVisible()
})

test('double tap zooms in with an overview, and back out', async ({ page }) => {
  await openPdf(page)
  const sc = page.getByTestId('pdf-scroller')
  const b = (await sc.boundingBox())!
  const x = b.x + b.width / 2
  const y = b.y + 200
  await page.mouse.click(x, y)
  await page.mouse.click(x, y)
  await expect(page.getByTestId('zoom-preview')).toBeVisible()
  await expect(page.getByLabel('Fit width')).toContainText('200%')
  await expect(page.getByTestId('zoom-frame')).toBeVisible()
  // The zoomed page can be panned: it is wider than the view.
  const wide = await sc.evaluate((el) => el.scrollWidth > el.clientWidth + 50)
  expect(wide).toBe(true)
  await page.getByTestId('zoom-close').click()
  await expect(page.getByTestId('zoom-preview')).toHaveCount(0)
  await expect(page.getByLabel('Fit width')).toContainText('100%')
})
