// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures/readerReady.ts'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7e (docs/features/reader-v2.md): "Highlight where I land",
 * RD-B30 to RD-B32. Flag reader.v2 is switched on with ?flags=reader.v2.
 */

test.use({ viewport: { width: 1200, height: 900 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openPdf(page: Page) {
  await page.goto('/?flags=reader.v2')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      Array.from({ length: 5 }, (_, i) => `Page ${i + 1} words here`),
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) await hide.click()
}

/** Bookmarks page 3, goes back to page 1 and ready to jump from the list. */
async function bookmarkThenLeave(page: Page) {
  await page.getByTestId('panel-toggle').click()
  await page.getByTestId('book-thumb').nth(2).click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 5')
  await page.getByTestId('reader-ribbon').click()
  await page.getByTestId('book-thumb').nth(0).click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 5')
}

async function jumpFromNotes(page: Page) {
  await page
    .getByTestId('left-panel')
    .getByRole('tab', { name: 'Notes' })
    .click()
  await page.getByTestId('annotation-row').getByRole('button').first().click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 5')
}

const glow = (page: Page) => page.getByTestId('pdf-land-glow')

test('RD-B30 a jump to a bookmark glows about 2 s; it is on for a new person', async ({
  page,
}) => {
  await openPdf(page)
  await bookmarkThenLeave(page)
  // Nothing glows by itself, and a Pencil or finger resting on the page
  // never makes it glow.
  await expect(glow(page)).toHaveCount(0)
  await page
    .locator('[data-pdf-page="1"]')
    .dispatchEvent('pointerdown', { pointerType: 'pen', pointerId: 7 })
  await page
    .locator('[data-pdf-page="1"]')
    .dispatchEvent('pointermove', { pointerType: 'pen', pointerId: 7 })
  await expect(glow(page)).toHaveCount(0)
  await jumpFromNotes(page)
  await expect(glow(page)).toBeAttached()
  await expect(glow(page)).toHaveAttribute('data-land', '')
  // The glow lasts about 2 s, then it is gone.
  await expect(glow(page)).toHaveCount(0, { timeout: 5000 })
})

test('RD-B31 the switch in Aa > More turns the glow off; the page still lands; remembered', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-aa').click()
  await page.getByTestId('aa-tab-more').click()
  const sw = page.getByTestId('aa-land-glow')
  await expect(sw).toBeChecked()
  await sw.uncheck()
  await expect(sw).not.toBeChecked()
  await page.keyboard.press('Escape')
  await bookmarkThenLeave(page)
  await jumpFromNotes(page)
  await expect(page.locator('.pdf-glow')).toHaveCount(0)
  // Still off after a reload.
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await page.getByTestId('reader-aa').click()
  await page.getByTestId('aa-tab-more').click()
  await expect(page.getByTestId('aa-land-glow')).not.toBeChecked()
})

test('RD-B32 reduced motion: a still outline for 1.6 s instead of the animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openPdf(page)
  await bookmarkThenLeave(page)
  await jumpFromNotes(page)
  await expect(glow(page)).toBeAttached()
  const look = await glow(page).evaluate((el) => {
    const s = getComputedStyle(el)
    return { animation: s.animationName, outline: s.outlineStyle }
  })
  expect(look).toEqual({ animation: 'none', outline: 'solid' })
  await expect(glow(page)).toHaveCount(0, { timeout: 4000 })
})

test('flag off: the reader has no such switch and glows as today', async ({
  page,
}) => {
  await page.goto('/')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(['Page 1 words', 'Page 2 words'], { title: 'Old' }),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await page.getByTestId('reader-aa').click()
  await page.getByTestId('aa-tab-more').click()
  await expect(page.getByTestId('aa-land-glow')).toHaveCount(0)
})
