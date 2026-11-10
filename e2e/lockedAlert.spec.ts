// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Browser } from '@playwright/test'
import { signInFromAccount } from './helpers.ts'

/**
 * Level 1 alert: signed in to Sync on a device that has no passphrase yet
 * (memory connector, no real account): one pop-up, "Later" leaves a banner,
 * unlocking removes both.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const PASS = 'river candle mango tiger'

async function device(browser: Browser, mockState?: string) {
  const context = await browser.newContext()
  await context.addInitScript((state) => {
    localStorage.setItem('learning-notes:sync.mock', '1')
    if (state && !sessionStorage.getItem('seeded')) {
      localStorage.setItem('learning-notes:sync.mockState', state)
      sessionStorage.setItem('seeded', '1')
    }
  }, mockState ?? null)
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  return context.newPage()
}

test('locked notebooks: pop-up once, Later leaves a banner, unlock clears both', async ({
  browser,
}) => {
  test.setTimeout(90_000)
  const a = await device(browser)
  await a.goto('/#/settings/sync')
  const sa = a.getByTestId('sync-section')
  await signInFromAccount(sa.page())
  await sa.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await sa.getByLabel('Type it again').fill(PASS)
  await sa.getByRole('button', { name: 'Lock my notes and start' }).click()
  const code = (
    await a.getByTestId('recovery-code').locator('.font-mono').innerText()
  ).trim()
  await sa
    .getByLabel(/last four letters/)
    .fill(code.replace(/-/g, '').slice(-4))
  await sa.getByRole('button', { name: 'I saved it' }).click()
  await expect(a.getByTestId('sync-status')).toContainText('Last synced')
  const state = (await a.evaluate(() =>
    localStorage.getItem('learning-notes:sync.mockState'),
  ))!

  const b = await device(browser, state)
  await b.goto('/#/settings/sync')
  const sb = b.getByTestId('sync-section')
  await signInFromAccount(sb.page())
  await expect(sb.getByLabel('Passphrase', { exact: true })).toBeVisible()
  // On the unlock form itself the pop-up never covers it.
  await b.waitForTimeout(1500)
  await expect(b.getByTestId('locked-modal')).toHaveCount(0)

  await b.evaluate(() => (location.hash = '#/'))
  const modal = b.getByRole('alertdialog', {
    name: 'Your notebooks are locked',
  })
  await expect(modal).toBeVisible({ timeout: 10_000 })
  await expect(modal).toContainText('Your synced notes are encrypted.')
  await expect(b.getByTestId('locked-banner')).toHaveCount(0)
  await modal.getByRole('button', { name: 'Later' }).click()
  await expect(modal).toHaveCount(0)
  const banner = b.getByTestId('locked-banner')
  await expect(banner).toContainText('Your notebooks are locked')

  // Same session: no second pop-up after a reload, the banner stays.
  await b.reload()
  await expect(banner).toBeVisible({ timeout: 10_000 })
  await expect(b.getByTestId('locked-modal')).toHaveCount(0)

  await banner.getByRole('button', { name: 'Unlock' }).click()
  // Unlock opens the Account row (account.syncNow); its link goes to Sync.
  await b
    .getByTestId('account-section')
    .getByRole('button', { name: 'Unlock in Sync' })
    .click()
  await sb.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await sb.getByRole('button', { name: 'Unlock' }).click()
  await expect(b.getByTestId('sync-status')).toContainText('Last synced', {
    timeout: 20_000,
  })
  await expect(banner).toHaveCount(0)
  await expect(b.getByTestId('locked-modal')).toHaveCount(0)
})
