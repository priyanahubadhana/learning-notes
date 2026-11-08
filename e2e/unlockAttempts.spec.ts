// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * Fix #3: a wrong passphrase or recovery code keeps and selects the text, shows
 * a red error with aria wiring, counts three free tries, then shows a wait
 * with a countdown; a wrong-length code is not a try; success resets the count.
 * In-memory connector: no real account is reached.
 */

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 1200, height: 800 },
})

const PASS = 'river candle mango tiger'
const KEY = 'learning-notes:unlock-throttle-v1'

async function device(browser: Browser, state?: string) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
  })
  await context.addInitScript(
    ([s]) => {
      localStorage.setItem('learning-notes:sync.mock', '1')
      localStorage.setItem('learning-notes:onboarding.done', 'true')
      localStorage.setItem('learning-notes:devicePicker.done', 'true')
      if (s && !sessionStorage.getItem('seeded')) {
        localStorage.setItem('learning-notes:sync.mockState', s)
        sessionStorage.setItem('seeded', '1')
      }
    },
    [state ?? null] as const,
  )
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  return context.newPage()
}

const stored = (page: Page, key: string) =>
  page.evaluate((k) => localStorage.getItem(k), key)

test('wrong passphrase: error, kept text, three tries, wait, then success resets', async ({
  browser,
}) => {
  test.setTimeout(150_000)
  const a = await device(browser)
  await a.goto('/#/settings/sync')
  const sa = a.getByTestId('sync-section')
  await sa.getByRole('button', { name: 'Sign in with Google' }).click()
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
  await sb.getByRole('button', { name: 'Sign in with Google' }).click()
  const box = sb.getByLabel('Passphrase', { exact: true })
  const unlock = sb.getByRole('button', { name: 'Unlock', exact: true })

  // Eye: hidden by default, shown on request.
  await box.fill('wrong one here')
  await expect(box).toHaveAttribute('type', 'password')
  await sb.getByRole('button', { name: 'Show passphrase' }).click()
  await expect(box).toHaveAttribute('type', 'text')

  // Try 1: red error, text kept and selected, wired for screen readers.
  await unlock.click()
  const err = sb.getByTestId('unlock-error')
  await expect(err).toHaveText(
    "That passphrase doesn't match. Check it and try again.",
  )
  await expect(err).toHaveAttribute('role', 'alert')
  await expect(box).toHaveAttribute('aria-invalid', 'true')
  const errId = await err.getAttribute('id')
  expect(await box.getAttribute('aria-describedby')).toContain(errId!)
  await expect(box).toHaveValue('wrong one here')
  await expect(box).toBeFocused()
  expect(
    await box.evaluate(
      (el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!,
    ),
  ).toBe('wrong one here'.length)
  expect(JSON.parse((await stored(b, KEY))!).passphrase.fails).toBe(1)

  // The same wrong value again counts once.
  await unlock.click()
  await expect(err).toBeVisible()
  expect(JSON.parse((await stored(b, KEY))!).passphrase.fails).toBe(1)
  // The typed text is nowhere on disk.
  expect(await stored(b, KEY)).not.toContain('wrong one here')

  // Tries 2 and 3, then the wait.
  await box.fill('wrong two here')
  await unlock.click()
  await expect(box).toBeEnabled()
  await box.fill('wrong three here')
  await unlock.click()
  const wait = sb.getByTestId('unlock-wait')
  await expect(wait).toContainText('Too many tries. Try again in 0:')
  await expect(box).toBeDisabled()
  await expect(unlock).toBeDisabled()
  const saved = JSON.parse((await stored(b, KEY))!)
  expect(saved.passphrase.fails).toBe(3)
  expect(saved.passphrase.lockedUntil).toBeGreaterThan(Date.now() - 5_000)
  // The code is counted separately: its box is open.
  await sb
    .getByRole('button', { name: 'Use your recovery code instead' })
    .click()
  const codeBox = sb.getByLabel('Recovery code', { exact: true })
  await expect(codeBox).toBeEnabled()
  // A wrong length is not a try.
  await codeBox.fill('ABCD-EFGH')
  await sb.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(sb.getByTestId('unlock-error')).toContainText(
    'has 26 letters and numbers. You typed 8.',
  )
  expect(JSON.parse((await stored(b, KEY))!).code.fails).toBe(0)
  await sb.getByRole('button', { name: 'Use your passphrase instead' }).click()

  // The wait ends (clock moved in storage): the right passphrase unlocks.
  await b.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!)
    s.passphrase.lockedUntil = Date.now() - 1
    localStorage.setItem(k, JSON.stringify(s))
  }, KEY)
  await expect(box).toBeEnabled({ timeout: 5_000 })
  await box.fill(PASS)
  await unlock.click()
  await expect(b.getByTestId('sync-status')).toContainText('Last synced', {
    timeout: 20_000,
  })
  expect(JSON.parse((await stored(b, KEY))!).passphrase.fails).toBe(0)
})
