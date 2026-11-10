// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { signInFromAccount } from './helpers.ts'

/**
 * Alerts system: one banner spot at the top, highest level only, Dismiss
 * rules, the Update offer merged in, and the Drive one-tap fix.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const PASS = 'river candle mango tiger'
const banner = (page: Page) => page.getByTestId('attention-banner')

async function signedIn(page: Page) {
  await page.goto('/#/settings/sync')
  const section = page.getByTestId('sync-section')
  await signInFromAccount(section.page())
  await section.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await section.getByLabel('Type it again').fill(PASS)
  await section.getByRole('button', { name: 'Lock my notes and start' }).click()
  const code = (
    await page.getByTestId('recovery-code').locator('.font-mono').innerText()
  ).trim()
  await section
    .getByLabel(/last four letters/)
    .fill(code.replace(/-/g, '').slice(-4))
  await section.getByRole('button', { name: 'I saved it' }).click()
  await expect(page.getByTestId('sync-status')).toContainText('Last synced')
}

async function mockPage(browser: import('@playwright/test').Browser) {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    localStorage.setItem('learning-notes:sync.mock', '1')
  })
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  return context.newPage()
}

test('Drive reconnect banner, one tap, update merged, one at a time', async ({
  browser,
}) => {
  test.setTimeout(90_000)
  const page = await mockPage(browser)
  await signedIn(page)
  await expect(banner(page)).toHaveCount(0)

  // An update is waiting (setting off), so the offer is a calm banner.
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:general.autoUpdate', '"off"'),
  )
  await page.reload()
  await page.waitForTimeout(500)
  await page.evaluate(() =>
    window.dispatchEvent(new Event('learning-notes:test-update')),
  )
  await expect(banner(page)).toHaveAttribute('data-code', 'update')
  await expect(banner(page)).toContainText('A new version is ready.')
  await expect(banner(page)).toHaveAttribute('role', 'status')

  // Drive needs a tap: the bright banner takes the spot; still one banner.
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:sync.mockDrive', 'tap'),
  )
  // A sync already running on a slow machine skips one nudge; nudge again.
  await expect
    .poll(
      async () => {
        await page.evaluate(() =>
          document.dispatchEvent(new Event('visibilitychange')),
        )
        return banner(page).getAttribute('data-code', { timeout: 1000 })
      },
      { timeout: 20_000 },
    )
    .toBe('driveTap')
  await expect(banner(page)).toHaveCount(1)
  await banner(page).getByRole('button', { name: 'Reconnect Drive' }).click()
  // Fixed: the update offer comes back in the same spot.
  await expect(banner(page)).toHaveAttribute('data-code', 'update')
  await expect(page.getByText('Drive reconnected')).toBeVisible()
})

test('Dismiss hides a bright banner until the next start', async ({
  browser,
}) => {
  const page = await mockPage(browser)
  await page.addInitScript(() => localStorage.setItem('attn.backupFails', '2'))
  await page.goto('/')
  await expect(banner(page)).toHaveAttribute('data-code', 'backups')
  await banner(page).getByRole('button', { name: 'Dismiss' }).click()
  await expect(banner(page)).toHaveCount(0)
  await page.waitForTimeout(1200)
  await expect(banner(page)).toHaveCount(0)
  await page.reload()
  await expect(banner(page)).toHaveAttribute('data-code', 'backups')
})

test('A calm banner stays hidden for a week after Dismiss', async ({
  browser,
}) => {
  const page = await mockPage(browser)
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.autoUpdate', '"off"'),
  )
  await page.goto('/')
  await page.waitForTimeout(500)
  await page.evaluate(() =>
    window.dispatchEvent(new Event('learning-notes:test-update')),
  )
  await expect(banner(page)).toHaveAttribute('data-code', 'update')
  await banner(page).getByRole('button', { name: 'Dismiss' }).click()
  await expect(banner(page)).toHaveCount(0)
  const until = await page.evaluate(
    () => JSON.parse(localStorage.getItem('attn.snooze.update')!).until,
  )
  expect(until).toBeGreaterThan(Date.now() + 6 * 86_400_000)
})
