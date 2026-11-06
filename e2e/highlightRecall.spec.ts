// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/** Wave 3 part A, CR3: one tap from a highlight to a card, and the daily review. */

test.use({ viewport: { width: 1200, height: 800 } })

const main = (page: Page) => page.getByRole('main')
const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openBook(page: Page) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      [
        'Mitochondria produce most cellular energy',
        'Chloroplasts capture sunlight for plants',
        'Ribosomes assemble proteins quickly',
      ],
      { title: 'Cell Book' },
    ),
  })
  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

async function select(page: Page, text: string, pageNo: number) {
  // The book has to be open before the column can be scrolled.
  await expect(page.getByTestId('reader-page')).toContainText('of 3')
  await page.getByTestId('pdf-scroller').evaluate((el, n) => {
    el.scrollTop = (el.scrollHeight * (n - 1)) / 3
  }, pageNo)
  await expect(
    page.locator('.textLayer span', { hasText: text }).first(),
  ).toBeVisible()
  await expect(async () => {
    await page.evaluate((needle) => {
      const span = Array.from(
        document.querySelectorAll('.textLayer span'),
      ).find((s) => s.textContent?.includes(needle))
      if (!span?.firstChild) throw new Error('text not found')
      const range = document.createRange()
      range.selectNodeContents(span)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    }, text)
    await expect(page.getByTestId('selection-popup')).toBeVisible({
      timeout: 1500,
    })
  }).toPass({ timeout: 15_000 })
}

test('Make card from a selection: a scheduled card that links back to the spot', async ({
  page,
}) => {
  await openBook(page)
  await select(page, 'Mitochondria', 1)
  await page.getByTestId('popup-make-card').click()
  await expect(page.getByText('Made 1 card.')).toBeVisible()

  // It is a real card: Review › All cards › Study.
  await page.getByTestId('reader-close').click()
  await space(page, 'Review').click()
  await page.getByRole('button', { name: 'All cards' }).first().click()
  await main(page)
    .getByRole('button', { name: /^Study/ })
    .first()
    .click()
  await expect(main(page).getByText('…').first()).toBeVisible()
  // The "From: Cell Book" line jumps to the highlight.
  await page.getByTestId('card-source').click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.getByTestId('reader-page')).toHaveText('Page 1 of 3')
})

test('Cards from all highlights: preview, untick one, one Undo takes the batch away', async ({
  page,
}) => {
  await openBook(page)
  for (const [text, n] of [
    ['Mitochondria', 1],
    ['Chloroplasts', 2],
    ['Ribosomes', 3],
  ] as const) {
    await select(page, text, n)
    await page.getByTestId('hl-yellow').click()
    await expect(page.getByText('Highlight saved.')).toBeVisible()
  }
  await page.getByTestId('reader-annotations').click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(3)
  await page.getByTestId('make-cards-all').click()
  const dialog = page.getByTestId('bulk-cards')
  await expect(dialog.getByRole('checkbox')).toHaveCount(3)
  await dialog.getByRole('checkbox').nth(1).uncheck()
  await dialog.getByTestId('bulk-make').click()
  await expect(page.getByText('Made 2 cards.')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()

  // All of them can be carded again after the Undo.
  await page.getByTestId('make-cards-all').click()
  await expect(
    page.getByTestId('bulk-cards').getByRole('checkbox'),
  ).toHaveCount(3)
})

test('Highlights for today: shown on Review, Make card from the tile', async ({
  page,
}) => {
  await openBook(page)
  await select(page, 'Chloroplasts', 2)
  await page.getByTestId('hl-green').click()
  await expect(page.getByText('Highlight saved.')).toBeVisible()
  await page.getByTestId('reader-close').click()
  await space(page, 'Review').click()
  await page.getByRole('button', { name: 'All cards' }).first().click()
  const tile = page.getByTestId('daily-highlights')
  await expect(tile).toContainText('Chloroplasts capture sunlight')
  await tile.getByTestId('daily-make-card').click()
  await expect(page.getByText('Card made.')).toBeVisible()
  await expect(tile.getByTestId('daily-make-card')).toBeDisabled()
  await tile.getByTestId('daily-seen').click()
  await expect(tile).toContainText('All caught up for today.')
})

test('Look up → Add to vocabulary makes a card on a Vocabulary page', async ({
  page,
}) => {
  await openBook(page)
  await select(page, 'Ribosomes', 3)
  await page.getByRole('button', { name: 'Look up' }).click()
  await page.getByTestId('popup-vocab').click()
  await expect(page.getByText(/Added .* to your vocabulary\./)).toBeVisible()
  await page.getByTestId('reader-close').click()
  await space(page, 'Notebooks').click()
  await expect(
    page.getByRole('button', { name: 'Vocabulary', exact: true }),
  ).toBeVisible()
})
