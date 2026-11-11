// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Frame, type Page } from '@playwright/test'
import { makeEpub } from './fixtures/books.ts'

/** The Bookerly-style reading font (Literata, bundled) inside an EPUB page. */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function bookFrame(page: Page, text: string): Promise<Frame> {
  let found: Frame | null = null
  await expect
    .poll(
      async () => {
        for (const f of page.frames()) {
          if (f === page.mainFrame()) continue
          const body = await f
            .evaluate(() => document.body?.innerText ?? '')
            .catch(() => '')
          if (body.includes(text)) {
            found = f
            return true
          }
        }
        return false
      },
      { timeout: 15_000 },
    )
    .toBe(true)
  return found!
}

test('Bookerly-style font: the EPUB page really loads Literata, and it is remembered', async ({
  page,
}) => {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'story.epub',
    mimeType: 'application/epub+zip',
    buffer: makeEpub('The Story'),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  const before = await bookFrame(page, 'quick brown fox')
  await page.getByTestId('reader-aa').click()
  await page.getByTestId('aa-font-bookerly').click()
  await expect(page.getByTestId('aa-font-bookerly')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const frame = await bookFrame(page, 'quick brown fox')
  void before
  await expect
    .poll(
      () =>
        frame.evaluate(async () => {
          const family = getComputedStyle(document.body).fontFamily
          await document.fonts.load('16px "Literata"')
          return {
            family: family.includes('Literata'),
            loaded: document.fonts.check('16px "Literata"'),
            faces: [...document.fonts].filter(
              (f) =>
                f.family.replace(/"/g, '') === 'Literata' &&
                f.status === 'loaded',
            ).length,
          }
        }),
      { timeout: 15_000 },
    )
    .toEqual({ family: true, loaded: true, faces: expect.any(Number) })
  await page.reload()
  await page.getByTestId('reader-aa').click()
  await expect(page.getByTestId('aa-font-bookerly')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
