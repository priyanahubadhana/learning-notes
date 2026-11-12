// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, addPage, openPage, typeInEditor } from './helpers.ts'
import {
  enterCode,
  lockScreen,
  lockThisPage,
  openLockSettings,
  setCode,
} from './lockHelpers.ts'

/** Slice 11b (flag security.m1): new PIN = 6 digits, new password = 8+, old PINs still unlock. */

const FLAGS = 'learning-notes:flags'
const flagOn = (page: Page) =>
  page.evaluate((k) => localStorage.setItem(k, '["security.m1"]'), FLAGS)

async function dialogFor(page: Page, kind: 'PIN' | 'Password') {
  await page
    .getByTestId(`method-${kind}`)
    .getByRole('button', { name: /^(Set up|Change)$/ })
    .click()
  return page.getByRole('dialog', {
    name: kind === 'PIN' ? 'Set a PIN' : 'Set a password',
  })
}

test('S8: a new PIN needs 6 digits; Save stays off with the hint', async ({
  page,
}) => {
  await page.addInitScript((k) => {
    localStorage.setItem(k, '["security.m1"]')
  }, FLAGS)
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await openLockSettings(page)
  const d = await dialogFor(page, 'PIN')
  await expect(d).toContainText('A PIN is 6 digits.')
  const save = d.getByRole('button', { name: 'Save' })
  for (const n of ['1234', '12345']) {
    await d.locator('#code-a').fill(n)
    await d.locator('#code-b').fill(n)
    await expect(save).toBeDisabled()
  }
  await d.locator('#code-a').fill('123456')
  await d.locator('#code-b').fill('123456')
  await expect(save).toBeEnabled()
})

test('S9: a new password needs 8 characters; the hint shows before typing', async ({
  page,
}) => {
  await page.addInitScript((k) => {
    localStorage.setItem(k, '["security.m1"]')
  }, FLAGS)
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await openLockSettings(page)
  const d = await dialogFor(page, 'Password')
  await expect(d).toContainText('At least 8 characters.')
  const save = d.getByRole('button', { name: 'Save' })
  await expect(save).toBeDisabled()
  await d.locator('#code-a').fill('1234567')
  await d.locator('#code-b').fill('1234567')
  await expect(save).toBeDisabled()
  await d.locator('#code-a').fill('12345678')
  await d.locator('#code-b').fill('12345678')
  await expect(save).toBeEnabled()
})

test('S10 S11: an old 4-digit PIN still unlocks, shows the note, and a 6-digit change clears it', async ({
  page,
}) => {
  // Flag off: the old rules let a 4-digit PIN be set.
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await addPage(page, 'Diary', 'Private page')
  await typeInEditor(page, 'secret')
  await openLockSettings(page)
  await setCode(page, 'PIN', '4821')
  await expect(page.getByTestId('pin-short-note')).toHaveCount(0)
  await flagOn(page)
  await page.reload()
  await openLockSettings(page)
  const note = page.getByTestId('pin-short-note')
  await expect(note).toContainText(
    'Your PIN may be shorter than 6 digits. Change it for better privacy.',
  )
  // It still unlocks.
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await enterCode(page, '4821')
  await expect(page.locator('.bn-editor')).toContainText('secret')
  await expect(lockScreen(page)).toHaveCount(0)
  // Change it to 6 digits.
  await openLockSettings(page)
  await note.getByRole('button', { name: 'Change PIN' }).click()
  const auth = page.getByTestId('auth-dialog')
  await auth.locator('#unlock-code').fill('4821')
  await auth.locator('#unlock-code').press('Enter')
  const d = page.getByRole('dialog', { name: 'Set a PIN' })
  await d.locator('#code-a').fill('482193')
  await d.locator('#code-b').fill('482193')
  await d.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('PIN changed')).toBeVisible()
  await expect(page.getByTestId('pin-short-note')).toHaveCount(0)
})
