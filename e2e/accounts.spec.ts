// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/**
 * Accounts are required (9 Nov 2026): the welcome has no way to skip the
 * account; sign in by email code or email + password; Connected accounts in
 * Settings > Account. The in-memory connector is used (every code is 123456).
 */

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 1200, height: 800 },
})

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('learning-notes:sync.mock', '1')
  })
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
})

test('the welcome has no way to skip the account', async ({ page }) => {
  await page.goto('/')
  const welcome = page.getByTestId('welcome')
  await expect(welcome.getByText('Sign in or create an account')).toBeVisible()
  await expect(welcome.getByText('Use without an account')).toHaveCount(0)
  await expect(welcome.getByRole('button', { name: 'Skip' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(welcome).toBeVisible()
})

test('email code: a wrong code is refused, the right one signs in', async ({
  page,
}) => {
  await page.goto('/')
  const welcome = page.getByTestId('welcome')
  await welcome.getByRole('button', { name: /Email me a code/ }).click()
  await welcome.getByLabel('Email').fill('owner@example.com')
  await welcome.getByRole('button', { name: 'Send code' }).click()
  await welcome.getByLabel('6-digit code').fill('000000')
  await welcome.getByRole('button', { name: 'Continue' }).click()
  await expect(welcome.getByTestId('signin-error')).toBeVisible()
  await welcome.getByLabel('6-digit code').fill('123456')
  await welcome.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('signin-guide')).toBeVisible()
})

test('password: a short one is refused, create with a code, then the guide opens', async ({
  page,
}) => {
  await page.goto('/')
  const welcome = page.getByTestId('welcome')
  await welcome.getByRole('button', { name: /Email and password/ }).click()
  await welcome.getByRole('tab', { name: 'Create account' }).click()
  await welcome.getByLabel('Email').fill('owner@example.com')
  await welcome.getByLabel('Password').fill('short')
  await expect(welcome.getByText('Use at least 15 characters.')).toBeVisible()
  await welcome.getByLabel('Password').fill('correct horse battery staple')
  await welcome.getByRole('button', { name: 'Create account' }).last().click()
  await welcome.getByLabel('6-digit code').fill('123456')
  await welcome.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('signin-guide')).toBeVisible()
})

test('Connected accounts lists methods, adds Google and never drops the last', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    localStorage.setItem('learning-notes:onboarding.done', 'true')
    localStorage.setItem('learning-notes:devicePicker.done', 'true')
  })
  await page.goto('/#/settings/account')
  const section = page.getByTestId('account-section')
  await section.getByRole('button', { name: /Email me a code/ }).click()
  await section.getByLabel('Email').fill('owner@example.com')
  await section.getByRole('button', { name: 'Send code' }).click()
  await section.getByLabel('6-digit code').fill('123456')
  await section.getByRole('button', { name: 'Continue' }).click()
  const list = page.getByTestId('connected-accounts')
  await expect(list.locator('[data-method="code"]')).toHaveAttribute(
    'data-connected',
    'true',
  )
  // Only one method: no Disconnect anywhere.
  await expect(list.getByRole('button', { name: 'Disconnect' })).toHaveCount(0)
  await list.getByRole('button', { name: 'Add a password' }).click()
  await list.getByLabel('New password').fill('correct horse battery staple')
  await list.getByRole('button', { name: 'Save password' }).click()
  await expect(list.locator('[data-method="password"]')).toHaveAttribute(
    'data-connected',
    'true',
  )
  await list
    .locator('[data-method="google"]')
    .getByRole('button', { name: 'Connect' })
    .click()
  await expect(list.locator('[data-method="google"]')).toHaveAttribute(
    'data-connected',
    'true',
  )
  await list
    .locator('[data-method="google"]')
    .getByRole('button', { name: 'Disconnect' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Disconnect' })
    .click()
  await expect(list.locator('[data-method="google"]')).toHaveAttribute(
    'data-connected',
    'false',
  )
  await expect(list.getByRole('button', { name: 'Disconnect' })).toHaveCount(0)
})
