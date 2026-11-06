// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Page } from '@playwright/test'
import { pageAction, showSidebar, sidebar, cornerAction } from './helpers.ts'

/** Opens Settings › Lock. */
export async function openLockSettings(page: Page) {
  await showSidebar(page)
  await cornerAction(page, 'Settings')
  await page.getByRole('button', { name: /^Lock, / }).click()
  await expect(page.getByTestId('lock-section')).toBeVisible()
}

/** Sets a PIN or a password in Settings › Lock (nothing set yet, or confirmed). */
export async function setCode(
  page: Page,
  kind: 'PIN' | 'Password',
  code: string,
  /** The code that is set now (or 'device'): changing the lock asks for it first. */
  current?: string,
) {
  const row = page.getByTestId(`method-${kind}`)
  await row.getByRole('button', { name: /^(Set up|Change)$/ }).click()
  if (current === 'device') {
    await page.getByTestId('auth-dialog').getByTestId('unlock-device').click()
  } else if (current) {
    const auth = page.getByTestId('auth-dialog')
    await auth.locator('#unlock-code').fill(current)
    await auth.locator('#unlock-code').press('Enter')
  }
  const dialog = page.getByRole('dialog', {
    name: kind === 'PIN' ? 'Set a PIN' : 'Set a password',
  })
  await dialog.locator('#code-a').fill(code)
  await dialog.locator('#code-b').fill(code)
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(row).toContainText('is set')
}

/** Enters a code on the lock screen (or the confirm dialog) and submits. */
export async function enterCode(page: Page, code: string) {
  const field = page.locator('#unlock-code')
  await field.fill(code)
  await field.press('Enter')
}

/** Opens a locked page from the sidebar (its name starts with a lock). */
export async function openLockedPage(page: Page, title: string) {
  await showSidebar(page)
  await sidebar(page)
    .getByRole('button', { name: `🔒 ${title}`, exact: true })
    .click()
}

/** The lock screen. */
export const lockScreen = (page: Page) => page.getByTestId('lock-screen')

/** Locks the open page from its ⋯ menu. */
export async function lockThisPage(page: Page) {
  await pageAction(page, 'Lock this page')
  await expect(lockScreen(page)).toBeVisible()
}

/** Pretends the app went to the background (or came back). */
export async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => s,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, state)
}

/** All text the app has stored for the lock, to prove no code is kept. */
export async function storedSettingsJson(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const idb = open.result
          const req = idb
            .transaction('settings', 'readonly')
            .objectStore('settings')
            .getAll()
          req.onsuccess = () => resolve(JSON.stringify(req.result))
          req.onerror = () => reject(req.error)
        }
      }),
  )
}
