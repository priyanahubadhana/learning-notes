// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/**
 * Drive backup needs Google. An account that signs in only by email sees one
 * clear button, "Connect Google for Drive backup"; once Google is connected
 * the button goes. The in-memory connector is used (every code is 123456).
 */

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 1200, height: 800 },
})

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('learning-notes:sync.mock', '1')
    localStorage.setItem('learning-notes:onboarding.done', 'true')
    localStorage.setItem('learning-notes:devicePicker.done', 'true')
  })
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
})

test('an email-only account is told how to get Drive backup, and the button connects Google', async ({
  page,
}) => {
  await page.goto('/#/settings/account')
  const section = page.getByTestId('account-section')
  await section.getByRole('button', { name: /Email me a code/ }).click()
  await section.getByLabel('Email').fill('reader@example.com')
  await section.getByRole('button', { name: 'Send code' }).click()
  await section.getByLabel('6-digit code').fill('123456')
  await section.getByRole('button', { name: 'Continue' }).click()
  const card = page.getByTestId('drive-connect-google')
  await expect(card).toBeVisible()
  await expect(card).toContainText('Drive backup needs Google')
  await card
    .getByRole('button', { name: 'Connect Google for Drive backup' })
    .click()
  await expect(card).toHaveCount(0)
  // The account now lists Google (the real button leaves for Google and
  // comes back; the test connector connects at once).
  await page.reload()
  await expect(
    page.getByTestId('connected-accounts').locator('[data-method="google"]'),
  ).toHaveAttribute('data-connected', 'true')
})

test('an account that already has Google never sees the Connect Google button', async ({
  page,
}) => {
  await page.goto('/#/settings/account')
  await page
    .getByTestId('account-section')
    .getByRole('button', { name: 'Sign in with Google' })
    .click()
  await expect(page.getByTestId('connected-accounts')).toBeVisible()
  await expect(
    page.getByTestId('connected-accounts').locator('[data-method="google"]'),
  ).toHaveAttribute('data-connected', 'true')
  await expect(page.getByTestId('drive-connect-google')).toHaveCount(0)
})
