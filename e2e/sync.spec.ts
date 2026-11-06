// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Browser, type Page } from '@playwright/test'
import { createNotebook, sidebar, showSidebar } from './helpers.ts'

/**
 * Phase L sync with the in-memory connector (no real account is reached):
 * set up on device A (passphrase, printed code), then unlock on device B
 * with the passphrase and see A's notebook; B's own notes stay.
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
  // No real sync host may be called.
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  return context.newPage()
}

const mockState = (page: Page) =>
  page.evaluate(() => localStorage.getItem('learning-notes:sync.mockState'))

test('set up on one device, unlock on another; notes merge, server holds only locked data', async ({
  browser,
}) => {
  test.setTimeout(90_000)
  const a = await device(browser)
  await a.goto('/')
  await createNotebook(a, 'Sync Biology', 'Cells')

  await a.goto('/#/settings/sync')
  const section = a.getByTestId('sync-section')
  await section.getByRole('button', { name: 'Sign in with Google' }).click()
  await section.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await section.getByLabel('Type it again').fill(PASS)
  await section.getByRole('button', { name: 'Lock my notes and start' }).click()

  const code = (
    await a.getByTestId('recovery-code').locator('.font-mono').innerText()
  ).trim()
  expect(code).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{2}$/)
  await section.getByLabel(/last four letters/).fill('XXXX')
  await section.getByRole('button', { name: 'I saved it' }).click()
  await expect(
    section.getByText('Those are not the last four letters.'),
  ).toBeVisible()
  await section
    .getByLabel(/last four letters/)
    .fill(code.replace(/-/g, '').slice(-4))
  await section.getByRole('button', { name: 'I saved it' }).click()
  await expect(a.getByTestId('sync-status')).toContainText('Last synced')

  const state = (await mockState(a))!
  expect(state).toBeTruthy()
  expect(state).not.toContain('Sync Biology')
  expect(state).not.toContain('Cells')
  expect(JSON.parse(state).seq).toBeGreaterThan(3)

  // Device B already has its own notebook: it must survive the sign-in.
  const b = await device(browser, state)
  await b.goto('/')
  await createNotebook(b, 'Only on B', 'Mine')
  await b.goto('/#/settings/sync')
  const sb = b.getByTestId('sync-section')
  await sb.getByRole('button', { name: 'Sign in with Google' }).click()
  await sb
    .getByLabel('Passphrase', { exact: true })
    .fill('wrong passphrase here')
  await sb.getByRole('button', { name: 'Unlock' }).click()
  await expect(sb.getByText(/does not open the notes/)).toBeVisible()
  await sb.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await sb.getByRole('button', { name: 'Unlock' }).click()
  await expect(b.getByTestId('sync-status')).toContainText('Last synced', {
    timeout: 20_000,
  })

  await b.goto('/')
  await showSidebar(b)
  await expect(
    sidebar(b).getByRole('button', { name: 'Sync Biology', exact: true }),
  ).toBeVisible()
  await expect(
    sidebar(b).getByRole('button', { name: 'Only on B', exact: true }),
  ).toBeVisible()
})

test('the device check reports the lock time', async ({ browser }) => {
  const a = await device(browser)
  await a.goto('/#/settings/sync')
  await a.getByText('Check this device').click()
  await a.getByRole('button', { name: 'Run check' }).click()
  await expect(a.getByTestId('device-check')).toContainText('Web Crypto yes', {
    timeout: 20_000,
  })
})
