/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/**
 * L13: on the preview host the "did not finish" screen carries one small
 * line with the failing step and the seconds waited; on any other host it
 * does not. The failure is forced: the pretend update without the real
 * reload never restarts, so the 6 s limit runs out.
 */
const HOST = 'build-next.learning-notes-app.pages.dev'
const PORT = Number(process.env.PW_PORT ?? 5199)
const notice = (page: import('@playwright/test').Page) =>
  page.locator('[data-mandatory-update]')
const pretend = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('learning-notes:test-required-update', { detail: null }),
    ),
  )

test.describe('on the preview host', () => {
  test.use({
    baseURL: `https://${HOST}`,
    ignoreHTTPSErrors: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `https://${HOST}`,
          localStorage: [
            { name: 'learning-notes:devicePicker.done', value: 'true' },
            { name: 'learning-notes:onboarding.done', value: 'true' },
            { name: 'learning-notes:accountGate.off', value: '1' },
          ],
        },
      ],
    },
  })
  test.beforeEach(async ({ context }) => {
    // .dev is https-only: the preview host is served from the local build.
    await context.route(`https://${HOST}/**`, async (route) => {
      const url = route
        .request()
        .url()
        .replace(`https://${HOST}`, `http://localhost:${PORT}`)
      await route.fulfill({ response: await route.fetch({ url }) })
    })
  })
  test.afterEach(async ({ context }) => {
    await context.unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('L13 the failed screen names the step and the seconds waited', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.route('**/precache.json*', (r) =>
      r.fulfill({ json: { files: [] } }),
    )
    await page.goto('/?flags=update.v2')
    await expect(page.locator('aside')).toBeAttached()
    await pretend(page)
    await expect(notice(page)).toHaveAttribute('data-phase', 'failed', {
      timeout: 30_000,
    })
    await expect(notice(page).locator('[data-failure-note]')).toHaveText(
      /Preview note: the restart did not come after [5-7] s/,
    )
  })
})

test('L13 on another host the failed screen has no extra line', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [] } }),
  )
  await page.goto('/?flags=update.v2')
  await expect(page.locator('aside')).toBeAttached()
  await pretend(page)
  await expect(notice(page)).toHaveAttribute('data-phase', 'failed', {
    timeout: 30_000,
  })
  await expect(notice(page).locator('[data-failure-note]')).toHaveCount(0)
})
