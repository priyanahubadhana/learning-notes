// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Frame, type Page } from '@playwright/test'
import { makeEpub } from './fixtures/books.ts'

/** Wave 3 part A, C3: the EPUB reader. */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openEpub(page: Page) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'story.epub',
    mimeType: 'application/epub+zip',
    buffer: makeEpub('The Story'),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

/** The frame holding the chapter text (foliate keeps it in a closed shadow root). */
async function bookFrame(page: Page, text: string): Promise<Frame> {
  await expect
    .poll(
      async () => {
        for (const f of page.frames()) {
          if (f === page.mainFrame()) continue
          const body = await f
            .evaluate(() => document.body?.innerText ?? '')
            .catch(() => '')
          if (body.includes(text)) return true
        }
        return false
      },
      { timeout: 15_000 },
    )
    .toBe(true)
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue
    const body = await f
      .evaluate(() => document.body?.innerText ?? '')
      .catch(() => '')
    if (body.includes(text)) return f
  }
  throw new Error('frame not found')
}

test('an EPUB opens, shows its text, has Contents, and Aa size changes the text', async ({
  page,
}) => {
  await openEpub(page)
  const frame = await bookFrame(page, 'quick brown fox')
  const before = await frame.evaluate(
    () => getComputedStyle(document.documentElement).fontSize,
  )
  await page.getByTestId('epub-larger').click()
  await expect
    .poll(() =>
      frame.evaluate(() => getComputedStyle(document.documentElement).fontSize),
    )
    .not.toBe(before)
  // Contents lists the chapters; the second one opens.
  await page.getByTestId('reader-contents').click()
  await page.getByRole('button', { name: 'Chapter 2' }).click()
  await bookFrame(page, 'Second chapter text')
})

test('select text in a book, highlight it, and it is kept after a reload', async ({
  page,
}) => {
  await openEpub(page)
  const frame = await bookFrame(page, 'quick brown fox')
  await frame.evaluate(() => {
    const p = document.querySelector('p')!
    const range = document.createRange()
    range.selectNodeContents(p)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  })
  await expect(page.getByTestId('selection-popup')).toBeVisible()
  await page.getByTestId('hl-pink').click()
  await page.getByTestId('reader-annotations').click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(1)
  await expect(page.getByTestId('annotations-panel')).toContainText(
    'quick brown fox',
  )
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await page.getByTestId('reader-annotations').click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(1)
  // Tapping the row jumps back into the book.
  await page.getByRole('button', { name: 'Go to this spot' }).click()
  await bookFrame(page, 'quick brown fox')
})

test('Pages mode turns pages with the arrows', async ({ page }) => {
  await openEpub(page)
  await bookFrame(page, 'quick brown fox')
  await page.getByTestId('epub-flow').click()
  await expect(page.getByTestId('epub-flow')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.waitForTimeout(1200) // the layout settles after the switch
  await page.getByTestId('epub-next').click()
  await bookFrame(page, 'Second chapter text')
  await page.waitForTimeout(1200) // the page turn finishes before the next one
  await page.getByTestId('epub-prev').click()
  await bookFrame(page, 'quick brown fox')
})
