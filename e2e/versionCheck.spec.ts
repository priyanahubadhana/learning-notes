// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/**
 * "Check for updates now" must not depend on the service worker: it reads
 * /version.json and, when it names a newer build, restarts the app by itself.
 */
test('a newer version.json is found and applied from Settings', async ({
  page,
}) => {
  await page.route('**/version.json*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify({
        commit: 'ffffffffffffffffffffffffffffffffffffffff',
      }),
    }),
  )
  await page.goto('/#/settings')
  await page.evaluate(() => {
    ;(window as unknown as Record<string, number>).__before = 1
  })
  await page.getByRole('button', { name: /check for updates/i }).click()
  await expect
    .poll(
      () =>
        page
          .evaluate(
            () => !(window as unknown as Record<string, number>).__before,
          )
          .catch(() => true),
      { timeout: 20_000 },
    )
    .toBe(true)
})
