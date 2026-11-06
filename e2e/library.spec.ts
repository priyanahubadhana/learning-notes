// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeDocx, makeEpub, makePdf } from './fixtures/books.ts'
import { sidebar } from './helpers.ts'

/**
 * Wave 3 part A: the Library (C1), the PDF reader (C2), highlights and notes
 * (C4) and Capture (CR1).
 */

test.use({ viewport: { width: 1200, height: 800 } })

const main = (page: Page) => page.getByRole('main')
const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

const pdf = () =>
  makePdf(
    ['Alpha page words here', 'Bravo page words here', 'Charlie page words'],
    {
      title: 'Fixture Book',
    },
  )

async function openLibrary(page: Page) {
  await page.goto('/')
  await space(page, 'Library').click()
  await expect(
    main(page).getByRole('heading', { name: 'Library' }),
  ).toBeVisible()
}

async function importFile(
  page: Page,
  name: string,
  mimeType: string,
  buffer: Buffer,
) {
  await page
    .getByTestId('library-file')
    .setInputFiles({ name, mimeType, buffer })
}

/** Scrolls to a page of the 3-page fixture, waits for its text, selects `text`. */
async function selectText(page: Page, text: string, pageNo = 1) {
  const scroll = () =>
    page.getByTestId('pdf-scroller').evaluate((el, n) => {
      el.scrollTop = (el.scrollHeight * (n - 1)) / 3
    }, pageNo)
  // The scroller can grow or jump while the pages measure themselves (slow on
  // CI), which drops the page's text again: scroll again on every try.
  await expect(async () => {
    await scroll()
    await expect(
      page.locator('.textLayer span', { hasText: text }).first(),
    ).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15_000 })
  // A page can draw again while it loads (which drops a selection): try
  // until the pop-up shows.
  await expect(async () => {
    await scroll()
    await page.evaluate((needle) => {
      const spans = Array.from(document.querySelectorAll('.textLayer span'))
      const span = spans.find((s) => s.textContent?.includes(needle))
      if (!span?.firstChild) throw new Error('text not found: ' + needle)
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

test('import a PDF: a card with a cover, a book page with sections, Continue opens the reader', async ({
  page,
}) => {
  await openLibrary(page)
  await importFile(page, 'fixture.pdf', 'application/pdf', pdf())
  const card = page.getByTestId('source-card')
  await expect(card).toHaveCount(1)
  await expect(card.getByText('Fixture Book')).toBeVisible()
  await expect(card.getByText('Test Author')).toBeVisible()
  await expect(card.getByText('0% read')).toBeVisible()
  await expect(card.getByRole('img')).toBeVisible()
  // The sidebar of the Library lists it too.
  await expect(
    sidebar(page).getByRole('button', { name: 'Fixture Book' }),
  ).toBeVisible()

  // The book page: header with Continue, then the three sections.
  await card.getByRole('button', { name: 'Fixture Book' }).click()
  await expect(page.getByTestId('book-continue')).toBeVisible()
  await expect(main(page).getByText('Highlights & notes').first()).toBeVisible()
  await expect(
    main(page).getByRole('heading', { name: 'Summary' }),
  ).toBeVisible()

  await page.getByTestId('book-continue').click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.getByTestId('reader-page')).toHaveText('Page 1 of 3')
})

test('reading progress is saved and the book opens where you left it', async ({
  page,
}) => {
  await openLibrary(page)
  await importFile(page, 'fixture.pdf', 'application/pdf', pdf())
  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await expect(page.getByTestId('reader-page')).toHaveText('Page 1 of 3')
  await page.getByTestId('pdf-scroller').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(page.getByTestId('reader-page')).toHaveText('Page 3 of 3')
  await page.waitForTimeout(2600) // saved after 2 s of stillness
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.getByTestId('reader-page')).toHaveText(/Page [23] of 3/)
  await page.getByTestId('reader-close').click()
  await space(page, 'Library').click()
  await expect(page.getByText(/[1-9]\d?% read/)).toBeVisible()
})

test('Contents jump, zoom and a bookmark', async ({ page }) => {
  await openLibrary(page)
  await importFile(page, 'fixture.pdf', 'application/pdf', pdf())
  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByRole('button', { name: 'Fit width' })).toHaveText(
    '125%',
  )
  await page.getByTestId('reader-bookmark').click()
  await expect(page.getByTestId('reader-bookmark')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByTestId('reader-contents').click()
  await expect(page.getByText('This book has no contents list.')).toBeVisible()
})

test('select text, highlight it, and it lands on the book page and survives a reload', async ({
  page,
}) => {
  await openLibrary(page)
  await importFile(page, 'fixture.pdf', 'application/pdf', pdf())
  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await expect(page.locator('.textLayer span').first()).toBeVisible()
  await selectText(page, 'Alpha page')
  await expect(page.getByTestId('selection-popup')).toBeVisible()
  await page.getByTestId('hl-green').click()
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()

  await page.reload()
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()

  // The annotations panel lists it; the book page has the quote.
  await page.getByTestId('reader-annotations').click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(1)
  await expect(page.getByTestId('annotations-panel')).toContainText(
    'Alpha page',
  )
  await page.getByTestId('reader-close').click()
  await expect(
    main(page).getByText('Alpha page words here').first(),
  ).toBeVisible()
})

test('a note, Undo of a delete, and the Markdown copy', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openLibrary(page)
  await importFile(page, 'fixture.pdf', 'application/pdf', pdf())
  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await expect(page.locator('.textLayer span').first()).toBeVisible()
  await selectText(page, 'Bravo page', 2)
  await page.getByRole('button', { name: 'Note', exact: true }).click()
  await page.getByTestId('note-text').fill('Remember this one')
  await page.getByTestId('note-save').click()
  await page.getByTestId('reader-annotations').click()
  await expect(page.getByTestId('annotations-panel')).toContainText(
    'Remember this one',
  )
  await page.getByTestId('export-copy').click()
  const md = await page.evaluate(() => navigator.clipboard.readText())
  expect(md).toContain('> Bravo page')
  expect(md).toContain('Remember this one')

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(1)
})

test('a saved highlight links back to the exact spot', async ({ page }) => {
  await openLibrary(page)
  await importFile(page, 'fixture.pdf', 'application/pdf', pdf())
  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await expect(page.locator('.textLayer span').first()).toBeVisible()
  await selectText(page, 'Charlie page', 3)
  await page.getByTestId('hl-yellow').click()
  await page.getByTestId('reader-close').click()
  // The saved line on the book page carries a link back to page 3.
  const link = main(page).getByRole('link', { name: 'Page 3' })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.getByTestId('reader-page')).toHaveText('Page 3 of 3')
})

test('import an EPUB and a DOCX: cards appear, the DOCX is a read-only chapter tree', async ({
  page,
}) => {
  await openLibrary(page)
  await importFile(page, 'story.epub', 'application/epub+zip', makeEpub())
  await expect(page.getByTestId('source-card')).toHaveCount(1)
  await expect(page.getByText('Epub Author')).toBeVisible()
  await importFile(
    page,
    'notes.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    makeDocx(),
  )
  await expect(page.getByTestId('source-card')).toHaveCount(2)
  await page
    .getByTestId('source-card')
    .filter({ hasText: 'notes' })
    .getByRole('button', { name: /Start reading|Open/ })
    .click()
  // Continue opens the first chapter, locked to reading.
  await expect(main(page).getByText('Opening words')).toBeVisible()
  await expect(page.getByTestId('reading-frame')).toHaveAttribute(
    'data-view',
    'inPlace',
  )
})

test('a file that is not a book is refused, and nothing is added', async ({
  page,
}) => {
  await openLibrary(page)
  await importFile(
    page,
    'fake.pdf',
    'application/pdf',
    Buffer.from('just text'),
  )
  await expect(
    page.getByText('This is not a PDF, EPUB or DOCX file'),
  ).toBeVisible()
  await expect(page.getByTestId('source-card')).toHaveCount(0)
})

// ---------------------------------------------------------------- Capture

test('Capture: pasted text becomes a source page in Sources; chips filter', async ({
  page,
}) => {
  await openLibrary(page)
  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  await page.getByTestId('capture-url').fill('https://example.com/post')
  await page.getByTestId('capture-title').fill('A web post')
  await page
    .getByTestId('capture-text')
    .fill('First line\n\n- point one\n- point two')
  await page.getByTestId('capture-save').click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'A web post',
  )
  await expect(main(page).getByText('point one')).toBeVisible()
  await expect(
    main(page).getByRole('link', { name: 'Open the original' }),
  ).toHaveAttribute('href', 'https://example.com/post')
  await space(page, 'Library').click()
  await expect(page.getByTestId('source-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Videos', exact: true }).click()
  await expect(page.getByTestId('source-card')).toHaveCount(0)
  await page.getByRole('button', { name: 'Articles', exact: true }).click()
  await expect(page.getByTestId('source-card')).toHaveCount(1)
})

test('#/capture?url= opens prefilled and a non-https link is refused', async ({
  page,
}) => {
  await page.goto(
    '/#/capture?url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ%3Ft%3D90&title=Talk',
  )
  await expect(page.getByTestId('capture-url')).toHaveValue(
    'https://youtu.be/dQw4w9WgXcQ?t=90',
  )
  await expect(page.getByTestId('capture-title')).toHaveValue('Talk')
  await expect(
    page.getByText('YouTube video dQw4w9WgXcQ, starts at 1:30.'),
  ).toBeVisible()
  await page.getByTestId('capture-url').fill('http://insecure.example')
  await page.getByTestId('capture-save').click()
  await expect(page.getByRole('alert')).toContainText('https://')
})

test('page 1 is on screen before the Contents are read', async ({ page }) => {
  // The Contents take 6 s in this test; page 1 must not wait for them.
  await page.addInitScript(() => {
    ;(
      window as unknown as { __pdfOutlineDelayMs: number }
    ).__pdfOutlineDelayMs = 6000
  })
  await openLibrary(page)
  await importFile(page, 'fixture.pdf', 'application/pdf', pdf())
  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await expect(page.getByTestId('reader-page')).toHaveText('Page 1 of 3')
  await expect(
    page.locator('.textLayer span', { hasText: 'Alpha' }).first(),
  ).toBeVisible({ timeout: 4000 })
})
