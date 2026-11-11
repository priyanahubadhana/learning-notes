// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  openPage,
  openSearchPopup,
  sidebar,
  showSidebar,
  typeInEditor,
} from './helpers.ts'

/**
 * Owner decision Q3a (11 Nov 2026): a device with no sign-in shows its notes
 * read-only until the person signs in. Reading, search and export still work;
 * nothing is deleted or hidden; signed-in people (also offline with an old
 * token) never see it. The default test setup turns the gate off; here it is
 * switched on again after the notes are made.
 */

const OFF = 'learning-notes:accountGate.off'
const editor = (page: Page) => page.locator('.bn-editor')
const bar = (page: Page) => page.getByTestId('account-gate-bar')

/** Makes a notebook with a note while the gate is still off, then turns it on. */
async function deviceWithNotes(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Day one')
  await typeInEditor(page, 'first line')
  await page.evaluate((k) => localStorage.removeItem(k), OFF)
  await page.reload()
}

test('a device that never signed in asks to sign in and shows its notes read-only', async ({
  page,
}) => {
  await deviceWithNotes(page)
  await expect(bar(page)).toContainText(
    'Sign in to keep editing and sync your notes',
  )
  await openPage(page, 'Day one')
  await expect(editor(page)).toContainText('first line')
  await expect(page.getByTestId('account-gate-page-bar')).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'Page title' }),
  ).toHaveAttribute('readonly', '')
  // Typing changes nothing.
  await editor(page)
    .click({ force: true })
    .catch(() => {})
  await page.keyboard.type(' more')
  await page.waitForTimeout(700)
  await expect(editor(page)).not.toContainText('more')

  // Search still works.
  const popup = await openSearchPopup(page)
  await popup.getByRole('combobox').first().fill('first')
  await expect(popup.getByText('Day one').first()).toBeVisible()
  await page.keyboard.press('Escape')

  // Nothing was deleted or hidden, also after a reload.
  await page.reload()
  await expect(bar(page)).toBeVisible()
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: 'Day one', exact: true }),
  ).toBeVisible()
  await openPage(page, 'Day one')
  await expect(editor(page)).toContainText('first line')
})

test('creating is refused and opens the sign-in sheet; offline it says so', async ({
  page,
}) => {
  await deviceWithNotes(page)
  await showSidebar(page)
  await sidebar(page).getByLabel('New notebook').click()
  const sheet = page.getByTestId('account-gate-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('Sign in to keep editing')).toBeVisible()
  await expect(
    sheet.getByRole('button', { name: /Sign in with Google/ }),
  ).toBeVisible()
  // No new notebook was made.
  await sheet.getByRole('button', { name: 'Not now' }).click()
  await expect(sheet).toBeHidden()
  await expect(
    sidebar(page).getByRole('button', { name: /Untitled notebook/ }),
  ).toHaveCount(0)

  // Offline the sheet explains instead of offering a sign-in that cannot work.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })
    window.dispatchEvent(new Event('offline'))
  })
  await page.getByTestId('account-gate-signin').click()
  await expect(page.getByTestId('account-gate-offline')).toBeVisible()
})

test('signing in unlocks editing at once and the bar goes away', async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    localStorage.setItem('learning-notes:sync.mock', '1'),
  )
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  await deviceWithNotes(page)
  await expect(bar(page)).toBeVisible()
  await page.getByTestId('account-gate-signin').click()
  await page
    .getByTestId('account-gate-sheet')
    .getByRole('button', { name: /Sign in with Google/ })
    .click()
  // The guided sign-in takes over; the test connector signs in at once.
  const guide = page.getByTestId('signin-guide')
  await expect(guide).toBeVisible()
  await guide.getByRole('button', { name: 'Not now' }).click()
  await expect(bar(page)).toHaveCount(0)
  await openPage(page, 'Day one')
  await expect(page.getByTestId('account-gate-page-bar')).toHaveCount(0)
  await typeInEditor(page, ' more')
  await expect(editor(page)).toContainText('more')
  // Still signed in after a reload.
  await page.reload()
  await expect(bar(page)).toHaveCount(0)
})

test('a signed-in person offline with an expired sign-in is never gated', async ({
  page,
  context,
}) => {
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Day one')
  await typeInEditor(page, 'first line')
  await page.evaluate((k) => {
    localStorage.removeItem(k)
    localStorage.setItem(
      'learning-notes:sync.session',
      JSON.stringify({
        access: 'expired',
        refresh: 'old',
        expiresAt: 1,
        account: { accountId: 'a', email: 'me@example.com', sub: 's' },
      }),
    )
  }, OFF)
  await page.reload()
  await expect(sidebar(page)).toBeAttached()
  await page.waitForTimeout(2500) // the renewal fails (offline) and keeps the session
  await expect(bar(page)).toHaveCount(0)
  await openPage(page, 'Day one')
  await typeInEditor(page, ' more')
  await expect(editor(page)).toContainText('more')
  await page.reload()
  await expect(bar(page)).toHaveCount(0)
  await expect(
    await page.evaluate(() =>
      localStorage.getItem('learning-notes:sync.session'),
    ),
  ).not.toBeNull()
})
