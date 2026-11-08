// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * Fix #1: the first screen offers "Sign in with Google" or "Use without an
 * account"; sign-in continues on full-screen sheets (passphrase, recovery
 * code, unlock) instead of Settings; "Make a new recovery code" in Settings.
 * The in-memory connector is used: no real account is reached.
 */

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 1200, height: 800 },
})

const PASS = 'river candle mango tiger'

async function device(
  browser: Browser,
  mockState?: string,
  skipWelcome = false,
) {
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1200, height: 800 },
  })
  await context.addInitScript(
    ([state, skip]) => {
      localStorage.setItem('learning-notes:sync.mock', '1')
      if (skip) {
        localStorage.setItem('learning-notes:onboarding.done', 'true')
        localStorage.setItem('learning-notes:devicePicker.done', 'true')
      }
      if (state && !sessionStorage.getItem('seeded')) {
        localStorage.setItem('learning-notes:sync.mockState', state)
        sessionStorage.setItem('seeded', '1')
      }
    },
    [mockState ?? null, skipWelcome] as const,
  )
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  return context.newPage()
}

const mockState = (page: Page) =>
  page.evaluate(() => localStorage.getItem('learning-notes:sync.mockState'))
const stored = (page: Page, key: string) =>
  page.evaluate((k) => localStorage.getItem('learning-notes:' + k), key)
const last4 = (code: string) => code.replace(/-/g, '').slice(-4)

async function newAccount(page: Page) {
  await page.goto('/')
  const welcome = page.getByTestId('welcome')
  await welcome.getByRole('button', { name: 'Sign in with Google' }).click()
  const guide = page.getByTestId('signin-guide')
  await expect(guide).toBeVisible()
  // The welcome waits while the guide is open.
  await expect(welcome).toHaveCount(0)
  await guide.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await guide.getByLabel('Type it again').fill(PASS)
  await guide.getByRole('button', { name: 'Lock my notes and start' }).click()
  const code = (
    await guide.getByTestId('recovery-code').locator('.font-mono').innerText()
  ).trim()
  expect(code).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{2}$/)
  return { guide, code }
}

test('sign in first: passphrase, big code with Copy and Save, confirm, then the welcome goes on', async ({
  browser,
}) => {
  test.setTimeout(90_000)
  const page = await device(browser)
  const { guide, code } = await newAccount(page)

  await guide.getByRole('button', { name: 'Copy' }).click()
  await expect(guide.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code)
  const download = page.waitForEvent('download')
  await guide.getByRole('button', { name: 'Save as file (.txt)' }).click()
  expect((await download).suggestedFilename()).toBe(
    'learning-notes-recovery-code.txt',
  )

  await guide.getByLabel(/last four letters/).fill('XXXX')
  await guide.getByRole('button', { name: 'I saved it' }).click()
  await expect(
    guide.getByText('Those are not the last four letters.'),
  ).toBeVisible()
  await guide.getByLabel(/last four letters/).fill(last4(code))
  await guide.getByRole('button', { name: 'I saved it' }).click()
  await expect(guide).toHaveCount(0)
  // The rest of the welcome follows, without asking about the account again.
  const welcome = page.getByTestId('welcome')
  await expect(welcome).toContainText('How will you write?')
  expect(await stored(page, 'onboarding.guide')).toBe('false')
  // The code is nowhere in the server state.
  expect(await mockState(page)).not.toContain(code)
  await welcome.getByRole('button', { name: 'Skip' }).click()
  await page.goto('/#/settings/sync')
  await expect(page.getByTestId('sync-status')).toContainText('Last synced')
})

test('an existing account unlocks on a second device with the code; Not now keeps the app usable', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const a = await device(browser)
  const { guide, code } = await newAccount(a)
  await guide.getByLabel(/last four letters/).fill(last4(code))
  await guide.getByRole('button', { name: 'I saved it' }).click()
  await expect(a.getByTestId('welcome')).toBeVisible()
  const state = (await mockState(a))!

  const b = await device(browser, state)
  await b.goto('/')
  await b
    .getByTestId('welcome')
    .getByRole('button', { name: 'Sign in with Google' })
    .click()
  const gb = b.getByTestId('signin-guide')
  await expect(gb.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await gb
    .getByRole('button', { name: 'Use your recovery code instead' })
    .click()
  await gb.getByLabel('Recovery code', { exact: true }).fill(code)
  await gb.getByRole('button', { name: 'Unlock' }).click()
  await expect(gb).toHaveCount(0)
  await expect(b.getByTestId('welcome')).toContainText('How will you write?')

  // A third device: Not now closes the guide; the app works.
  const c = await device(browser, state)
  await c.goto('/')
  await c
    .getByTestId('welcome')
    .getByRole('button', { name: 'Sign in with Google' })
    .click()
  await c
    .getByTestId('signin-guide')
    .getByRole('button', { name: 'Not now' })
    .click()
  await expect(c.getByTestId('signin-guide')).toHaveCount(0)
  await expect(c.getByTestId('welcome')).toBeVisible()
})

test('Use without an account never touches the network and never shows the guide', async ({
  browser,
}) => {
  const page = await device(browser)
  const calls: string[] = []
  page.on('request', (r) => {
    if (/supabase|google/.test(r.url())) calls.push(r.url())
  })
  await page.goto('/')
  await page
    .getByTestId('welcome')
    .getByRole('button', { name: 'Use without an account' })
    .click()
  await expect(page.getByTestId('signin-guide')).toHaveCount(0)
  await expect(page.getByTestId('welcome')).toContainText('How will you write?')
  expect(calls).toEqual([])
  expect(await stored(page, 'onboarding.accountAsked')).toBe('true')
})

test('Settings: a new recovery code needs the passphrase, then the old code stops working', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const a = await device(browser)
  const { guide, code } = await newAccount(a)
  await guide.getByLabel(/last four letters/).fill(last4(code))
  await guide.getByRole('button', { name: 'I saved it' }).click()
  await a.getByTestId('welcome').getByRole('button', { name: 'Skip' }).click()

  await a.goto('/#/settings/sync')
  const section = a.getByTestId('sync-section')
  await expect(a.getByTestId('sync-status')).toContainText('Last synced')
  await section
    .getByRole('button', { name: 'Make a new recovery code' })
    .click()
  await section
    .getByLabel('Passphrase', { exact: true })
    .fill('wrong passphrase here')
  await section.getByRole('button', { name: 'Make a new code' }).click()
  await expect(section.getByText(/passphrase doesn't match/)).toBeVisible()
  await section.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await section.getByRole('button', { name: 'Make a new code' }).click()
  const fresh = (
    await section.getByTestId('recovery-code').locator('.font-mono').innerText()
  ).trim()
  expect(fresh).not.toBe(code)
  await section.getByLabel(/last four letters/).fill(last4(fresh))
  await section.getByRole('button', { name: 'I saved it' }).click()
  await expect(section.getByTestId('new-code-saved')).toBeVisible()

  // Another device: the new code opens the notes, the old one does not.
  const state = (await mockState(a))!
  const b = await device(browser, state, true)
  await b.goto('/#/settings/sync')
  const sb = b.getByTestId('sync-section')
  await sb.getByRole('button', { name: 'Sign in with Google' }).click()
  await sb
    .getByRole('button', { name: 'Use your recovery code instead' })
    .click()
  await sb.getByLabel('Recovery code', { exact: true }).fill(code)
  await sb.getByRole('button', { name: 'Unlock' }).click()
  await expect(sb.getByText(/recovery code doesn't match/)).toBeVisible()
  await sb.getByLabel('Recovery code', { exact: true }).fill(fresh)
  await sb.getByRole('button', { name: 'Unlock' }).click()
  await expect(b.getByTestId('sync-status')).toContainText('Last synced', {
    timeout: 20_000,
  })
})
