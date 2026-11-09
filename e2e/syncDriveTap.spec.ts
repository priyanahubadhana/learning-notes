// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { signInFromAccount } from './helpers.ts'

/**
 * Fix #4: when Google truly needs a tap, the app shows one clear line with a
 * single "Reconnect Drive" button at the top, and it goes away after the
 * tap. Uses the in-memory connector ("tap" makes the quiet renewal fail).
 */

test.use({ viewport: { width: 1200, height: 800 } })

const PASS = 'river candle mango tiger'

test('Drive needs a tap: one bar, one Reconnect, then it is gone', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  const context = await browser.newContext()
  await context.addInitScript(() => {
    localStorage.setItem('learning-notes:sync.mock', '1')
  })
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  const page = await context.newPage()
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
  await expect(
    page.getByRole('status').getByText('Reconnect Drive'),
  ).toHaveCount(0)

  // Google now wants a tap; coming back to the app tries the quiet way first.
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:sync.mockDrive', 'tap'),
  )
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  )
  const bar = page.getByRole('status').filter({ hasText: 'Reconnect Drive' })
  await expect(bar).toBeVisible()
  await bar.getByRole('button', { name: 'Reconnect Drive' }).click()
  await expect(bar).toHaveCount(0)
})
