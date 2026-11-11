// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Web pictures in a paste never load silently: a copy is made when the
 * server allows it; otherwise a "Load remote image" card waits for a tap.
 */

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const editor = (page: Page) => page.locator('.bn-editor')

async function start(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Remote', 'Page one')
  await editor(page).click()
}

const paste = (page: Page, html: string, text: string) =>
  page.evaluate(
    ([h, t]) => {
      const data = new DataTransfer()
      data.setData('text/html', h)
      data.setData('text/plain', t)
      document.querySelector('.bn-editor')!.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    [html, text],
  )

test('a picture whose server allows it is copied into the app', async ({
  page,
}) => {
  await page.route('https://img.test/open.png', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'access-control-allow-origin': '*' },
      body: PNG,
    }),
  )
  await start(page)
  await paste(
    page,
    '<p>Look <b>here</b></p><img src="https://img.test/open.png">',
    'Look here',
  )
  const img = editor(page).locator('img.bn-visual-media')
  await expect(img).toHaveCount(1)
  // A local copy (an object URL), not the web address.
  await expect(img).toHaveAttribute('src', /^blob:/)
})

test('a picture without CORS shows a card; a tap loads it', async ({
  page,
}) => {
  let plain = 0
  let cors = 0
  await page.route('https://img.test/closed.png', (route) => {
    const h = route.request().headers()
    // Our copy attempt sends an Origin header (a server without CORS fails it,
    // simulated here by aborting); a plain <img> does not.
    if (h['origin']) {
      cors++
      return route.abort()
    }
    plain++
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG })
  })
  await start(page)
  await paste(
    page,
    '<p>Look <b>here</b></p><img src="https://img.test/closed.png">',
    'Look here',
  )
  const img = editor(page).locator('img.bn-visual-media')
  await expect(img).toHaveCount(1)
  await expect(img).toHaveAttribute('src', /^data:image\/svg\+xml/)
  // The card loaded nothing from the web by itself.
  expect(plain).toBe(0)
  expect(cors).toBe(1)

  await img.click()
  await expect(img).toHaveAttribute('src', 'https://img.test/closed.png')
  expect(plain).toBe(1)
})
