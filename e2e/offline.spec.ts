import { expect, test } from '@playwright/test'
import { BUILT_APP_URL } from '../playwright.config.ts'
import { setTitle } from './helpers.ts'

// Offline needs the built app: the dev server has no service worker.
test.use({ baseURL: BUILT_APP_URL })

test('the app and its notes open with no internet', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await setTitle(page, 'Written before going offline')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('aside')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Written before going offline',
  )
})

test('no update is offered to a first-time visitor', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect(page.getByRole('button', { name: 'Update' })).toBeHidden()
})
