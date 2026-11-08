// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Embeds beyond YouTube: Vimeo, Loom (a frame from that one host) and direct
 * .mp4 / .webm files (an inline video), all from the lone-address paste
 * chooser. Nothing is loaded until Play; other hosts stay link cards.
 */

const editor = (page: Page) => page.locator('.bn-editor')
const LOOM = 'c'.repeat(32)

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
  )
  // The outside world is never reached from a test.
  await page.route(/player\.vimeo\.com|loom\.com|cdn\.example\.com/, (r) =>
    r.abort(),
  )
  await page.goto('/')
  await createNotebook(page, 'Video', 'Page one')
  await editor(page).click()
})

const pasteUrl = (page: Page, url: string) =>
  page.evaluate((u) => {
    const data = new DataTransfer()
    data.setData('text/plain', u)
    document.querySelector('.bn-editor')!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, url)

async function embedFrom(page: Page, url: string) {
  await pasteUrl(page, url)
  const chooser = page.getByRole('dialog', { name: 'Paste as' })
  await expect(chooser).toBeVisible()
  await expect(
    chooser.getByRole('option', { name: /Embed \(video\)/ }),
  ).toBeVisible()
  await page.keyboard.press('Enter')
}

test('a Vimeo address becomes a card; the frame loads only after Play', async ({
  page,
}) => {
  await embedFrom(page, 'https://vimeo.com/76979871/abcdef1234')
  const card = page.locator('[data-embed="vimeo"]')
  await expect(card).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  await card.getByRole('button', { name: 'Play' }).click()
  await expect(page.locator('iframe')).toHaveAttribute(
    'src',
    'https://player.vimeo.com/video/76979871?dnt=1&autoplay=1&h=abcdef1234',
  )
})

test('a Loom address becomes a card with a Loom frame', async ({ page }) => {
  await embedFrom(page, `https://www.loom.com/share/${LOOM}`)
  const card = page.locator('[data-embed="loom"]')
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Play' }).click()
  await expect(page.locator('iframe')).toHaveAttribute(
    'src',
    new RegExp(`^https://www\\.loom\\.com/embed/${LOOM}\\?`),
  )
})

test('a direct .mp4 plays inline in a video element; http and other files stay links', async ({
  page,
}) => {
  await embedFrom(page, 'https://cdn.example.com/lesson.mp4')
  const card = page.locator('[data-embed="video"]')
  await expect(card).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
  await card.getByRole('button', { name: 'Play' }).click()
  await expect(page.locator('video')).toHaveAttribute(
    'src',
    'https://cdn.example.com/lesson.mp4',
  )
  await page.keyboard.press('Escape')

  // A plain http file is only a link card.
  await editor(page).click()
  await page.keyboard.press('Enter')
  await pasteUrl(page, 'http://cdn.example.com/other.mp4')
  const chooser = page.getByRole('dialog', { name: 'Paste as' })
  await expect(chooser.getByRole('option', { name: /Link card/ })).toBeVisible()
})
