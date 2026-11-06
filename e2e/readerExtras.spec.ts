/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'

/** Wave 5 part A, C5 and C2b: Page Flip, time left, Liquid mode, Find in a PDF. */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openBook(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles(file)
  await page.getByRole('button', { name: '▶ Start reading' }).click()
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

test('Page Flip: scrub to page 3, then Back returns to page 1', async ({
  page,
}) => {
  await openPdf(page)
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 3')
  await page.getByTestId('reader-flip').click()
  const slider = page.getByTestId('page-flip-slider')
  await expect(slider).toBeVisible()
  await slider.fill('3')
  await expect(page.getByTestId('page-flip-label')).toContainText('Page 3 of 3')
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 3')
  const back = page.getByTestId('page-flip-back')
  await expect(back).toContainText('Back to p. 1')
  await back.click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 3')
})

test('Time left shows once reading has a position', async ({ page }) => {
  await openPdf(page)
  await page.getByTestId('pdf-scroller').evaluate((el) => {
    el.scrollTop = 300
  })
  await expect(page.getByTestId('reader-timeleft')).toContainText('left in')
})

test('Find in a PDF lists matches and jumps to the page', async ({ page }) => {
  await openPdf(page)
  await page.getByTestId('reader-find').click()
  await page.getByTestId('pdf-find-input').fill('charlie')
  const hit = page.getByTestId('pdf-find-hit')
  await expect(hit).toHaveCount(1)
  await expect(hit).toContainText('Charlie')
  await hit.click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 3')
  await page.getByTestId('reader-find').click()
  await page.getByTestId('pdf-find-input').fill('zzzz')
  await expect(page.getByText('No matches.')).toBeVisible()
})

test('Liquid mode reflows the text and Show original returns to the page', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-liquid').click()
  const liquid = page.getByTestId('liquid-view')
  await expect(liquid).toContainText('Alpha page words here')
  await expect(page.getByTestId('liquid-layer')).toContainText(
    'Liquid mode (beta)',
  )
  await page.getByTestId('liquid-original').click()
  await expect(page.getByTestId('liquid-layer')).toHaveCount(0)
  await expect(page.getByTestId('pdf-scroller')).toBeVisible()
})

test('Pinch zoom: two fingers spreading zoom a PDF in', async ({ page }) => {
  await openPdf(page)
  await expect(page.getByLabel('Fit width')).toContainText('100%')
  await page.getByTestId('pdf-scroller').evaluate((el) => {
    const touch = (id: number, x: number, y: number) =>
      new Touch({ identifier: id, target: el, clientX: x, clientY: y })
    const fire = (type: string, touches: Touch[]) =>
      el.dispatchEvent(
        new TouchEvent(type, {
          touches,
          changedTouches: touches,
          bubbles: true,
          cancelable: true,
        }),
      )
    fire('touchstart', [touch(1, 500, 400), touch(2, 600, 400)])
    fire('touchmove', [touch(1, 450, 400), touch(2, 650, 400)])
    fire('touchend', [])
  })
  await expect(page.getByLabel('Fit width')).toContainText('200%')
})

test('EPUB: Page Flip shows the place as a percentage', async ({ page }) => {
  await openBook(page, {
    name: 'story.epub',
    mimeType: 'application/epub+zip',
    buffer: makeEpub('The Story'),
  })
  await page.getByTestId('reader-flip').click()
  await expect(page.getByTestId('page-flip-label')).toContainText(
    '% of the book',
  )
})
