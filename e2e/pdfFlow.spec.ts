/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/** A PDF can be read as one long scroll or one whole page at a time. */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openPdf(page: Page) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      ['Alpha page words here', 'Bravo page words here', 'Charlie page words'],
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 3')
}

test('page by page: one whole page fits the screen, the toggle is remembered', async ({
  page,
}) => {
  await openPdf(page)
  const scroller = page.getByTestId('pdf-scroller')
  await expect(scroller).toHaveAttribute('data-flow', 'scrolled')
  await page.getByTestId('pdf-flow').click()
  await expect(scroller).toHaveAttribute('data-flow', 'paged')
  // The whole first page is on screen at once.
  const fits = await scroller.evaluate((el) => {
    const p = el.querySelector<HTMLElement>('[data-pdf-page="1"]')!
    const a = p.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    return a.top >= b.top - 1 && a.bottom <= b.bottom + 1
  })
  expect(fits).toBe(true)
  // The Aa sheet shows the same choice.
  await page.getByTestId('reader-aa').click()
  await expect(page.getByTestId('aa-continuous')).not.toBeChecked()
  await page.getByTestId('aa-continuous').check()
  await expect(scroller).toHaveAttribute('data-flow', 'scrolled')
  await page.getByTestId('aa-continuous').uncheck()
  await expect(scroller).toHaveAttribute('data-flow', 'paged')
  // Remembered on this device.
  await page.reload()
  await expect(page.getByTestId('pdf-scroller')).toHaveAttribute(
    'data-flow',
    'paged',
  )
})

test('page by page: a page jump lands on a whole page', async ({ page }) => {
  await openPdf(page)
  await page.getByTestId('pdf-flow').click()
  await page.getByTestId('reader-flip').click()
  await page.getByTestId('page-flip-slider').fill('2')
  await expect(page.getByTestId('reader-page')).toContainText('Page 2 of 3')
  const fits = await page.getByTestId('pdf-scroller').evaluate((el) => {
    const p = el.querySelector<HTMLElement>('[data-pdf-page="2"]')!
    const a = p.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    return a.top >= b.top - 2 && a.bottom <= b.bottom + 2
  })
  expect(fits).toBe(true)
})

test('the Settings › Reading choice sets how a PDF opens', async ({ page }) => {
  await page.goto('/#/settings/reading')
  await page.getByText('One page at a time').first().click()
  await openPdf(page)
  await expect(page.getByTestId('pdf-scroller')).toHaveAttribute(
    'data-flow',
    'paged',
  )
})
