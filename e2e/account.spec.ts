// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * Settings › Account: the groups show, and "Sign out on all devices" asks
 * first, then calls the server's global sign-out (scope=global) with the
 * person's token and cancels Drive's long-lived key. All server endpoints are
 * mocked; a real session is seeded into the browser's storage.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const EMAIL = 'priyanahubadhanalegends@gmail.com'
const SESSION = 'learning-notes:sync.session'

async function seeded(
  page: Page,
  logoutStatus: number,
): Promise<{ logouts: string[]; revokes: number }> {
  const seen = { logouts: [] as string[], revokes: 0 }
  await page.context().addInitScript(
    ([key, email]) => {
      if (localStorage.getItem('seeded-once')) return
      localStorage.setItem('seeded-once', '1')
      localStorage.setItem(
        key,
        JSON.stringify({
          access: 'access-token-1',
          refresh: 'refresh-1',
          expiresAt: Date.now() + 3_600_000,
          account: { accountId: 'u1', email, sub: 's1' },
          drive: { token: 'drive-1', expiresAt: Date.now() + 3_000_000 },
        }),
      )
    },
    [SESSION, EMAIL] as const,
  )
  await page.route(/supabase\.co\/auth\/v1\/logout/, async (route) => {
    seen.logouts.push(
      `${route.request().url()} ${route.request().headers()['authorization']}`,
    )
    await route.fulfill({ status: logoutStatus, body: '' })
  })
  await page.route(
    /supabase\.co\/functions\/v1\/drive-token/,
    async (route) => {
      const body = route.request().postDataJSON() as { action: string }
      if (body.action === 'revoke') seen.revokes += 1
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{"error":"none"}',
      })
    },
  )
  await page.route(/supabase\.co\/rest\/v1\//, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.route(/googleapis\.com|accounts\.google\.com/, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"files":[]}',
    }),
  )
  return seen
}

test('Account page: who, connections, security and sessions', async ({
  page,
}) => {
  await seeded(page, 204)
  await page.goto('/#/settings/account')
  const account = page.getByTestId('account-section')
  await expect(account.getByTestId('account-email')).toHaveText(EMAIL)
  for (const name of ['Who', 'Connections', 'Security', 'Sessions'])
    await expect(account.getByRole('group', { name })).toBeVisible()
  await expect(
    account.getByRole('button', { name: 'Change in Lock' }),
  ).toBeVisible()
  await expect(
    account.getByRole('button', { name: 'Change in AI' }),
  ).toBeVisible()
  for (const name of [
    'Sign out on this device',
    'Sign out and forget the key here',
    'Sign out on all devices',
  ])
    await expect(account.getByRole('button', { name })).toBeVisible()
})

test('Sign out on all devices: confirm, global logout, Drive key cancelled', async ({
  page,
}) => {
  const seen = await seeded(page, 204)
  await page.goto('/#/settings/account')
  const account = page.getByTestId('account-section')
  await account.getByRole('button', { name: 'Sign out on all devices' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('will need to sign in again')
  await expect(dialog).toContainText('notes stay')
  // Cancel changes nothing.
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  expect(seen.logouts).toEqual([])
  await expect(account.getByTestId('account-email')).toHaveText(EMAIL)

  await account.getByRole('button', { name: 'Sign out on all devices' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sign out everywhere' })
    .click()
  await expect(account.getByTestId('account-all-done')).toBeVisible()
  expect(seen.logouts).toHaveLength(1)
  expect(seen.logouts[0]).toContain('/auth/v1/logout?scope=global')
  expect(seen.logouts[0]).toContain('Bearer access-token-1')
  expect(seen.revokes).toBe(1)
  expect(
    await page.evaluate((k) => localStorage.getItem(k), SESSION),
  ).toBeNull()
  await expect(
    account.getByRole('button', { name: 'Sign in with Google' }),
  ).toBeVisible()
})

test('Sign out on all devices: a server failure changes nothing', async ({
  page,
}) => {
  await seeded(page, 503)
  await page.goto('/#/settings/account')
  const account = page.getByTestId('account-section')
  await account.getByRole('button', { name: 'Sign out on all devices' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sign out everywhere' })
    .click()
  await expect(account.getByTestId('account-all-failed')).toBeVisible()
  await expect(account.getByTestId('account-email')).toHaveText(EMAIL)
  expect(
    await page.evaluate((k) => localStorage.getItem(k), SESSION),
  ).not.toBeNull()
})
