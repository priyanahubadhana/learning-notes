/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'

/**
 * Slice 7h (reader v2): the pen bar (RD-B47), drawing in a paged EPUB (RD-B48),
 * Finger draws (RD-B49), and Lasso behind its Professional switch (RD-P18,
 * RD-P33). Flag reader.v2 via ?flags=reader.v2.
 */
test.use({ viewport: { width: 1200, height: 900 } })

/** Seeds the level once per browser; a reload keeps whatever the test changed since. */
const level = (page: Page, value: 'beginner' | 'professional', on: string[]) =>
  page.addInitScript(
    ([v, ids]) => {
      if (localStorage.getItem('e2e.seeded')) return
      localStorage.setItem('e2e.seeded', '1')
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: v, unlocked: ids }),
      )
    },
    [value, on] as const,
  )

async function openBook(page: Page, kind: 'pdf' | 'epub') {
  await page.goto('/?flags=reader.v2')
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('library-file').setInputFiles(
    kind === 'pdf'
      ? {
          name: 'fixture.pdf',
          mimeType: 'application/pdf',
          buffer: makePdf(
            Array.from({ length: 3 }, (_, i) => `Page ${i + 1} words`),
            { title: 'Fixture Book' },
          ),
        }
      : {
          name: 'story.epub',
          mimeType: 'application/epub+zip',
          buffer: makeEpub('The Story'),
        },
  )
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

const startPen = async (page: Page) => {
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
}

test('RD-B47 the pen bar has Pen, Highlighter, Eraser, colour, size, and Done; Lasso waits for its switch', async ({
  page,
}) => {
  await level(page, 'beginner', [])
  await openBook(page, 'pdf')
  await startPen(page)
  const bar = page.getByTestId('reader-ink-bar')
  for (const id of ['pen', 'highlighter', 'eraser'])
    await expect(bar.getByTestId(`reader-ink-${id}`)).toBeVisible()
  await expect(bar.getByTestId('reader-ink-lasso')).toHaveCount(0)
  await expect(bar.getByTestId('reader-ink-colour-black')).toBeVisible()
  for (const n of [0, 1, 2])
    await expect(bar.getByTestId(`reader-ink-size-${n}`)).toBeVisible()
  // Eraser works as a tool: it becomes the pressed one.
  await bar.getByTestId('reader-ink-eraser').click()
  await expect(bar.getByTestId('reader-ink-eraser')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await bar.getByTestId('reader-ink-done').click()
  await expect(page.getByTestId('reader-ink-bar')).toHaveCount(0)
})

test('RD-B48 drawing in a paged EPUB says "Drawing works in Scroll mode" and offers Switch to Scroll', async ({
  page,
}) => {
  await openBook(page, 'epub')
  // The ⋯ card holds the layout row: Scroll now; one tap makes it Pages.
  await page.getByTestId('reader-more').click()
  await expect(page.getByTestId('epub-flow')).toContainText('Scroll')
  await page.getByTestId('epub-flow').click()
  await page.getByTestId('reader-more').click()
  await expect(page.getByTestId('epub-flow')).toContainText('Pages')
  await page.keyboard.press('Escape')
  await page.getByTestId('reader-ink').click()
  await expect(page.getByText(/Drawing works in Scroll mode/)).toBeVisible()
  await expect(page.getByTestId('reader-ink-bar')).toHaveCount(0)
  await page
    .getByRole('status')
    .getByRole('button', { name: 'Switch to Scroll' })
    .click()
  await page.getByTestId('reader-more').click()
  await expect(page.getByTestId('epub-flow')).toContainText('Scroll')
  await page.keyboard.press('Escape')
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
})

test('RD-B49 Finger draws is a switch with a one-line explanation that follows it', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await startPen(page)
  const finger = page.getByTestId('reader-ink-finger')
  const note = page.getByTestId('reader-ink-finger-note')
  await expect(finger).toHaveAttribute('aria-pressed', 'false')
  await expect(note).toContainText('Only the Pencil draws')
  await finger.click()
  await expect(finger).toHaveAttribute('aria-pressed', 'true')
  await expect(note).toContainText('Your finger draws')
  // It is the same setting the notes use: it stays after a reload.
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await startPen(page)
  await expect(page.getByTestId('reader-ink-finger')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByTestId('reader-ink-finger').click()
  await expect(page.getByTestId('reader-ink-finger')).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('RD-P18 reader.inkTools: Lasso shows with the switch on, and is gone when it is off (data stays)', async ({
  page,
}) => {
  await level(page, 'beginner', ['reader.inkTools'])
  await openBook(page, 'pdf')
  await startPen(page)
  await expect(page.getByTestId('reader-ink-lasso')).toBeVisible()
  await page.evaluate(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    ),
  )
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await startPen(page)
  await expect(page.getByTestId('reader-ink-lasso')).toHaveCount(0)
  await expect(page.getByTestId('reader-ink-pen')).toBeVisible()
})

test('RD-P18 Professional reads every switch as on: Lasso shows', async ({
  page,
}) => {
  await level(page, 'professional', [])
  await openBook(page, 'pdf')
  await startPen(page)
  await expect(page.getByTestId('reader-ink-lasso')).toBeVisible()
})
