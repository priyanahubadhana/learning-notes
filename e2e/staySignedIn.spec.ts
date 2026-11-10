/// <reference lib="dom" />
import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Sign-in is one-time: an expired access token plus a failing renewal
 * (offline, busy server, odd 400) must never sign the person out, across
 * reloads. Only a certain "refresh token gone" answer does. Endpoints mocked.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const EMAIL = 'priyanahubadhanalegends@gmail.com'
const SESSION = 'learning-notes:sync.session'

async function seed(page: Page) {
  await page.context().addInitScript(
    ([key, email]) => {
      if (localStorage.getItem('seeded-once')) return
      localStorage.setItem('seeded-once', '1')
      localStorage.setItem(
        key,
        JSON.stringify({
          access: 'old',
          refresh: 'refresh-1',
          expiresAt: Date.now() - 60_000, // ran out while the app slept
          account: { accountId: 'u1', email, sub: 's1' },
        }),
      )
    },
    [SESSION, EMAIL] as const,
  )
  await page.route(/supabase\.co\/(rest|functions)\/v1\//, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.route(/googleapis\.com|accounts\.google\.com/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  )
}

const saved = (page: Page) =>
  page.evaluate((k) => localStorage.getItem(k), SESSION)

for (const [name, fail] of [
  ['offline', (r: Route) => r.abort('failed')],
  ['busy server', (r: Route) => r.fulfill({ status: 503, body: '' })],
  [
    'odd 400',
    (r: Route) => r.fulfill({ status: 400, body: '<html>proxy</html>' }),
  ],
] as const) {
  test(`stays signed in when renewal fails (${name}), also after reload`, async ({
    page,
  }) => {
    await seed(page)
    await page.route(/supabase\.co\/auth\/v1\/token/, fail)
    await page.goto('/#/settings/account')
    await expect(page.getByTestId('account-section')).toBeVisible()
    await page.waitForTimeout(1500) // let the start-up renewal run and fail
    await page.reload()
    await expect(page.getByTestId('account-section')).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('signed-out-lock')).toHaveCount(0)
    expect(await saved(page)).toContain('refresh-1')
  })
}

test('a certain "refresh token gone" answer does sign out', async ({
  page,
}) => {
  await seed(page)
  await page.route(/supabase\.co\/auth\/v1\/token/, (r) =>
    r.fulfill({
      status: 400,
      contentType: 'application/json',
      body: '{"error_code":"refresh_token_not_found"}',
    }),
  )
  await page.goto('/#/settings/account')
  await expect.poll(() => saved(page)).toBeNull()
})
