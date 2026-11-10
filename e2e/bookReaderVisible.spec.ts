// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'
import { strToU8, unzipSync, zipSync } from 'fflate'

// Item 28: an opened book must never be blank. The EPUB text colour was drawn
// from an unresolved alias token (var(--color-surface-0)), so on a dark theme
// the text matched its page. Every theme must show readable text.

/** A long book: one chapter of 3,000 paragraphs (about 400 KB) and a short second one. */
function makeBigEpub(): Buffer {
  const small = makeEpub('Big')
  const files = unzipSync(small)
  const para = Array.from(
    { length: 3000 },
    (_, i) =>
      `<p>${i === 0 ? 'The quick brown fox' : 'Paragraph ' + i} jumps over the lazy dog again and again.</p>`,
  ).join('')
  files['OEBPS/c1.xhtml'] = strToU8(
    `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter 1</title></head><body><h1>Chapter 1</h1>${para}</body></html>`,
  )
  return Buffer.from(zipSync(files))
}

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function importBook(
  page: Page,
  name: string,
  mimeType: string,
  buffer: Buffer,
  theme?: string,
) {
  await page.goto('/')
  if (theme)
    await page.evaluate(
      (v) => document.documentElement.setAttribute('data-theme', v),
      theme,
    )
  await space(page, 'Library').click()
  await page
    .getByTestId('library-file')
    .setInputFiles({ name, mimeType, buffer })
}

for (const theme of ['dark', 'light']) {
  test(`an EPUB opened with Continue shows readable text on the ${theme} theme`, async ({
    page,
  }) => {
    await importBook(
      page,
      'story.epub',
      'application/epub+zip',
      makeBigEpub(),
      theme,
    )
    await page.getByRole('button', { name: 'Start reading' }).click()
    await expect(page.getByTestId('book-reader')).toBeVisible()
    await expect
      .poll(
        async () => {
          for (const f of page.frames()) {
            if (f === page.mainFrame()) continue
            const seen = await f
              .evaluate(() => {
                const text = document.body?.innerText ?? ''
                if (!text.includes('quick brown fox')) return null
                const rgb = (c: string) =>
                  c.match(/\d+/g)?.slice(0, 3).map(Number)
                const ink = rgb(getComputedStyle(document.body).color)
                const bg = rgb(getComputedStyle(document.body).backgroundColor)
                if (!ink || !bg) return 'unknown'
                const l = (v: number[]) => (v[0] + v[1] + v[2]) / 3
                const box = document.querySelector('p')!.getBoundingClientRect()
                const inView =
                  box.width > 20 &&
                  box.height > 5 &&
                  box.right > 0 &&
                  box.left < window.innerWidth
                if (!inView) return 'off-screen'
                return Math.abs(l(ink) - l(bg)) > 100 ? 'readable' : 'blank'
              })
              .catch(() => null)
            if (seen) return seen
          }
          return null
        },
        { timeout: 15_000 },
      )
      .toBe('readable')
  })
}

test('a PDF opened with Continue shows its page', async ({ page }) => {
  await importBook(
    page,
    'fixture.pdf',
    'application/pdf',
    makePdf(['Hello reader']),
  )
  await page.getByTestId('source-card').getByRole('button').first().click()
  await page.getByTestId('book-continue').click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(
    page.locator('[data-testid="book-reader"] canvas').first(),
  ).toBeVisible()
})
