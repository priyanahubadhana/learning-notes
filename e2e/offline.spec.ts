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

test('the built app works under the live security rules', async ({ page }) => {
  const blocked: string[] = []
  await page.exposeFunction('reportBlocked', (what: string) =>
    blocked.push(what),
  )
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const report = (window as unknown as Record<string, (s: string) => void>)
        .reportBlocked
      report(`${e.violatedDirective}: ${e.blockedURI}`)
    })
    localStorage.setItem('learning-notes:theme', '"night"')
  })
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain(
    "frame-ancestors 'none'",
  )
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.getByRole('textbox', { name: 'Page title' }).click()
  await page.keyboard.type('Checked')
  await page.keyboard.press('Enter')
  await page.keyboard.type('A line of notes')
  await expect(page.getByText('A line of notes')).toBeVisible()
  // The theme file ran before the app started.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await page.locator('aside').getByRole('button', { name: 'Settings' }).click()
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible()
  expect(blocked).toEqual([])
})
