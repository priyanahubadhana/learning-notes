// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, sidebar, showSidebar } from './helpers.ts'

/**
 * Remote sign-out ("Sign out on all devices" from another device): the full
 * screen lock, Start fresh, and the choice after signing back in. Server
 * endpoints are mocked; nothing real is reached.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const SESSION = 'learning-notes:sync.session'
const EMAIL = 'priyanahubadhanalegends@gmail.com'

async function mockServer(page: Page, refreshStatus: number) {
  // The last route registered wins, so the catch-all goes first.
  await page.route(/supabase\.co|googleapis\.com|accounts\.google\.com/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.route(/supabase\.co\/auth\/v1\/token/, (r) =>
    r.fulfill({
      status: refreshStatus,
      contentType: 'application/json',
      body: '{"error_code":"refresh_token_not_found"}',
    }),
  )
}

const seedSession = (page: Page) =>
  page.evaluate(
    ([key, email]) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          access: 'old',
          refresh: 'gone',
          expiresAt: Date.now() - 1000,
          account: { accountId: 'u1', email, sub: 's1' },
        }),
      ),
    [SESSION, EMAIL] as const,
  )

test('a session ended elsewhere shows the lock; Start fresh saves a backup and opens an empty app', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await mockServer(page, 400)
  await page.goto('/')
  await createNotebook(page, 'Secret notes', 'Page one')
  // The device had been signed in; the server has since ended the session.
  await page.evaluate(
    () => localStorage.setItem('learning-notes:sync.enabled', '1'), // had been syncing
  )
  await seedSession(page)
  await page.reload()

  const lock = page.getByTestId('signed-out-lock')
  await expect(lock).toBeVisible()
  await expect(lock).toContainText('You were signed out')
  await expect(lock).toContainText('Sign in to continue')
  // The notes are hidden (solid backdrop) and the app cannot be used behind it.
  const backdrop = await lock.evaluate(
    (el) => getComputedStyle(el, '::backdrop').backgroundColor,
  )
  expect(backdrop).not.toMatch(/rgba\(.*, 0\)|transparent/)
  await expect(
    sidebar(page)
      .getByRole('button', { name: 'Secret notes', exact: true })
      .click({ timeout: 1500 }),
  ).rejects.toThrow()
  // Still locked after a reload.
  await page.reload()
  await expect(page.getByTestId('signed-out-lock')).toBeVisible()

  await page.getByRole('button', { name: 'Start fresh on this device' }).click()
  await expect(page.getByTestId('fresh-unsent')).toContainText(/change/)
  const download = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Save backup and start fresh' })
    .click()
  expect((await download).suggestedFilename()).toContain('backup')

  // A brand-new app: the welcome opens and the notebook is gone.
  await expect(page.getByTestId('welcome')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('signed-out-lock')).toHaveCount(0)
  await expect(page.getByText('Secret notes')).toHaveCount(0)
})

test('a device that was never signed in is not locked', async ({ page }) => {
  await mockServer(page, 400)
  await page.goto('/')
  await createNotebook(page, 'Plain notes', 'Page')
  await page.reload()
  await expect(page.getByTestId('signed-out-lock')).toHaveCount(0)
  await expect(page.getByTestId('sync-choice')).toHaveCount(0)
})

test('sign back in with unsent edits: counts, then Merge both (the default) keeps everything', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:sync.mock', '1'),
  )
  await page.route(/supabase\.co|googleapis\.com|accounts\.google\.com/, (r) =>
    r.abort(),
  )
  await page.goto('/')
  await createNotebook(page, 'Synced notes', 'First')
  await page.goto('/#/settings/account')
  await page
    .getByTestId('account-section')
    .getByRole('button', { name: 'Sign in with Google' })
    .click()
  await page.goto('/#/settings/sync')
  const section = page.getByTestId('sync-section')
  await section
    .getByLabel('Passphrase', { exact: true })
    .fill('river candle mango tiger')
  await section.getByLabel('Type it again').fill('river candle mango tiger')
  await section.getByRole('button', { name: 'Lock my notes and start' }).click()
  const code = (
    await page.getByTestId('recovery-code').locator('.font-mono').innerText()
  ).trim()
  await section
    .getByLabel(/last four letters/)
    .fill(code.replace(/-/g, '').slice(-4))
  await section.getByRole('button', { name: 'I saved it' }).click()
  await expect(page.getByTestId('sync-status')).toContainText('Last synced')

  // The server becomes unreachable, a note is made (unsent), then the session ends.
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:sync.mockOffline', '1'),
  )
  await page.goto('/')
  await createNotebook(page, 'Made offline', 'Draft')
  await page.evaluate(() =>
    (window as unknown as { __lnEndSession?: () => void }).__lnEndSession?.(),
  )
  const lock = page.getByTestId('signed-out-lock')
  await expect(lock).toBeVisible()

  // Back online; sign in again.
  await page.evaluate(() =>
    localStorage.removeItem('learning-notes:sync.mockOffline'),
  )
  await lock.getByRole('button', { name: 'Sign in to continue' }).click()
  const choice = page.getByTestId('sync-choice')
  await expect(choice).toBeVisible()
  await expect(page.getByTestId('choice-here')).toContainText(/\d+ pages?/)
  await expect(page.getByTestId('choice-there')).toContainText('nothing')
  for (const name of [
    'Merge both',
    'Use this device’s version',
    'Use the cloud version',
  ])
    await expect(choice.getByRole('button', { name })).toBeVisible()
  await choice.getByRole('button', { name: /Merge both/ }).click()
  await expect(choice).toHaveCount(0)
  await expect(page.getByTestId('signed-out-lock')).toHaveCount(0)
  // The offline notebook is still here and now reaches the server.
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: 'Made offline', exact: true }),
  ).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(
        () => localStorage.getItem('learning-notes:sync.mockState')?.length,
      ),
    )
    .toBeGreaterThan(0)
})
