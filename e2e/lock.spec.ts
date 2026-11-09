// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openPage,
  openSearchPopup,
  openSidebar,
  showSidebar,
  sidebar,
  pageAction,
  typeInEditor,
} from './helpers.ts'
import {
  enterCode,
  lockScreen,
  openLockedPage,
  lockThisPage,
  openLockSettings,
  setCode,
  setVisibility,
  storedSettingsJson,
} from './lockHelpers.ts'

/**
 * Batch 3: the privacy lock. A page, notebook or database hides behind a lock
 * screen; the content is not drawn, searched, listed or reviewed while locked.
 * PIN and password are stored only as salted hashes.
 */

const SECRET = 'my secret diary entry'
const title = (page: Page) => page.getByRole('textbox', { name: 'Page title' })

/** A notebook with two pages; the second has a secret line and a PIN is set. */
async function start(page: Page, pin = '4821') {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await addPage(page, 'Diary', 'Private page')
  await typeInEditor(page, SECRET)
  await openLockSettings(page)
  await setCode(page, 'PIN', pin)
}

test('Settings › Lock says plainly it is a privacy lock, not encryption', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await openLockSettings(page)
  const section = page.getByTestId('lock-section')
  await expect(section).toContainText('not encryption')
  await expect(section).toContainText('casual eyes')
  await expect(section).toContainText('Set up at least one way to unlock')
  await expect(section).toContainText('Nothing is locked.')
})

test('locking with no code set up sends you to Settings › Lock first', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await pageAction(page, 'Lock this page')
  await expect(page.getByRole('status')).toContainText('Set up a PIN')
  await page
    .getByRole('status')
    .getByRole('button', { name: 'Open Settings' })
    .click()
  await expect(page.getByTestId('lock-section')).toBeVisible()
})

test('a PIN is 4–6 digits, must be typed twice, and only its hash is stored', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await openLockSettings(page)
  const row = page.getByTestId('method-PIN')
  await row.getByRole('button', { name: 'Set up' }).click()
  const dialog = page.getByRole('dialog', { name: 'Set a PIN' })
  await dialog.locator('#code-a').fill('12')
  await dialog.locator('#code-b').fill('12')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByRole('alert')).toContainText('4 to 6 digits')
  await dialog.locator('#code-a').fill('1234')
  await dialog.locator('#code-b').fill('1235')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByRole('alert')).toContainText('do not match')
  // Letters are not allowed in a PIN.
  await dialog.locator('#code-a').fill('12ab34')
  await expect(dialog.locator('#code-a')).toHaveValue('1234')
  await dialog.locator('#code-b').fill('1234')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(row).toContainText('is set')
  const stored = await storedSettingsJson(page)
  expect(stored).toContain('lock.config')
  expect(stored).toContain('"salt"')
  expect(stored).not.toContain('1234')
})

test('a password needs 6 characters; both a PIN and a password can be set', async ({
  page,
}) => {
  await start(page)
  await openLockSettings(page)
  const row = page.getByTestId('method-Password')
  await row.getByRole('button', { name: 'Set up' }).click()
  // Changing the lock asks for the current code first.
  const auth = page.getByTestId('auth-dialog')
  await auth.locator('#unlock-code').fill('4821')
  await auth.locator('#unlock-code').press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Set a password' })
  await dialog.locator('#code-a').fill('abc')
  await dialog.locator('#code-b').fill('abc')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByRole('alert')).toContainText('at least 6')
  await dialog.locator('#code-a').fill('correct horse')
  await dialog.locator('#code-b').fill('correct horse')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(row).toContainText('is set')
  expect(await storedSettingsJson(page)).not.toContain('correct horse')
})

test('a locked page shows only a lock screen: no text, then the right PIN opens it', async ({
  page,
}) => {
  await start(page)
  await openPage(page, 'Private page')
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
  await lockThisPage(page)
  await expect(lockScreen(page)).toContainText('Private page')
  await expect(lockScreen(page)).toContainText('🔒')
  await expect(page.locator('.bn-editor')).toHaveCount(0)
  await expect(page.getByText(SECRET)).toHaveCount(0)

  // A wrong PIN says so and does not open.
  await enterCode(page, '1111')
  await expect(lockScreen(page).getByRole('alert')).toContainText('not right')
  await expect(page.locator('.bn-editor')).toHaveCount(0)

  await enterCode(page, '4821')
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
  await expect(title(page)).toHaveValue('Private page')
})

test('five wrong tries make a short wait', async ({ page }) => {
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  for (let i = 0; i < 5; i++) {
    await enterCode(page, '0000')
    // The field empties once the try was checked.
    await expect(page.locator('#unlock-code')).toHaveValue('')
  }
  await expect(lockScreen(page).getByRole('alert')).toContainText(
    /Wait \d+ seconds/,
  )
  await expect(
    lockScreen(page).getByRole('button', { name: 'Unlock' }),
  ).toBeDisabled()
})

test('it locks again when you leave the page', async ({ page }) => {
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await enterCode(page, '4821')
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
  await openPage(page, 'Open page')
  await expect(page.locator('.bn-editor')).not.toContainText(SECRET)
  await openLockedPage(page, 'Private page')
  await expect(lockScreen(page)).toBeVisible()
  await expect(page.getByText(SECRET)).toHaveCount(0)
})

test('it locks when the app is hidden, and the screen is blank meanwhile', async ({
  page,
}) => {
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await enterCode(page, '4821')
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
  await setVisibility(page, 'hidden')
  await expect(page.locator('html')).toHaveAttribute('data-app-hidden', '')
  await expect(page.locator('.bn-editor')).toHaveCount(0)
  await setVisibility(page, 'visible')
  await expect(page.locator('html')).not.toHaveAttribute('data-app-hidden', '')
  await expect(lockScreen(page)).toBeVisible()
})

test('it locks after 5 idle minutes (changeable in Settings › Lock)', async ({
  page,
}) => {
  await page.clock.install()
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await enterCode(page, '4821')
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
  await page.clock.fastForward('04:30')
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
  await page.clock.fastForward('01:00')
  await expect(lockScreen(page)).toBeVisible()

  // The wait can be changed.
  await openLockSettings(page)
  const select = page.locator('[data-setting-id="lock.idleMinutes"] select')
  await expect(select).toHaveValue('5')
  await select.selectOption('1')
  await expect(select).toHaveValue('1')
})

test('hidden from search, Recent and the sidebar text; the title shows with a lock', async ({
  page,
}) => {
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await openPage(page, 'Open page')

  // Search: the words inside never match; the title does, with a 🔒.
  const popup = await openSearchPopup(page)
  await popup.getByRole('combobox').fill('diary')
  await expect(popup.getByRole('option')).toHaveCount(0)
  await popup.getByRole('combobox').fill('Private')
  await expect(popup.getByRole('option')).toHaveCount(1)
  await expect(popup.getByRole('option')).toContainText('🔒 Private page')
  await expect(popup.getByRole('option')).not.toContainText(SECRET)
  // The first Esc clears the words, the second closes the box.
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()

  // The sidebar and Recent show the title with the lock, never the text.
  const side = await openSidebar(page)
  await expect(side.getByRole('button', { name: 'Private page' })).toBeVisible()
  await side.getByRole('button', { name: 'Recent' }).click()
  await expect(
    side
      .getByRole('list', { name: 'Recent' })
      .getByRole('button', { name: 'Private page' }),
  ).toBeVisible()
  await expect(side).not.toContainText(SECRET)
})

test('a journal day that is locked shows a lock in the Calendar', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 18, 10, 0))
  await page.goto('/')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  await expect(title(page)).toHaveValue(/18 November 2026/)
  await openLockSettings(page)
  await setCode(page, 'PIN', '4821')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  await lockThisPage(page)
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Calendar' })
    .click()
  const day = page.getByRole('main').locator('[data-calendar-day="2026-11-18"]')
  await expect(day.locator('[data-source="journal"]')).toContainText('🔒')
})

test('a locked notebook hides all its pages', async ({ page }) => {
  await start(page)
  await page.getByRole('button', { name: 'Diary', exact: true }).first().click()
  await page.getByRole('button', { name: 'Tab options' }).click()
  await page.getByRole('menuitem', { name: 'Lock this notebook' }).click()
  await expect(lockScreen(page)).toContainText('This notebook is locked.')
  // A page inside is behind the same lock.
  await showSidebar(page)
  await sidebar(page)
    .getByRole('button', { name: 'Private page', exact: true })
    .click()
  await expect(lockScreen(page)).toBeVisible()
  await expect(page.getByText(SECRET)).toHaveCount(0)
  await enterCode(page, '4821')
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
  // Another page of the same notebook stays open (still inside the notebook).
  await openPage(page, 'Open page')
  await expect(title(page)).toHaveValue('Open page')
})

test('Settings › Lock lists what is locked and can remove one lock', async ({
  page,
}) => {
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await enterCode(page, '4821')
  await openLockSettings(page)
  const list = page.getByTestId('locked-list')
  await expect(list).toContainText('🔒 Private page')
  await list.getByRole('button', { name: 'Remove lock' }).click()
  // Changing the lock asks for the current code first.
  const auth = page.getByTestId('auth-dialog')
  await expect(auth).toBeVisible()
  await auth.locator('#unlock-code').fill('4821')
  await auth.locator('#unlock-code').press('Enter')
  await expect(page.getByTestId('lock-section')).toContainText(
    'Nothing is locked.',
  )
})

test('Forgot: with no device lock it explains plainly and can remove the lock after a tick', async ({
  page,
}) => {
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await lockScreen(page).getByRole('button', { name: 'Forgot?' }).click()
  const dialog = page.getByTestId('forgot-dialog')
  await expect(dialog).toContainText('not encryption')
  await expect(dialog).toContainText(
    'Anyone who has this device can do the same',
  )
  const remove = dialog.getByRole('button', { name: 'Remove the lock' })
  await expect(remove).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await remove.click()
  // Nothing was lost: the page opens with its text.
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
  await openLockSettings(page)
  await expect(page.getByTestId('lock-section')).toContainText(
    'Nothing is locked.',
  )
  await expect(page.getByTestId('method-PIN')).toContainText('is not set')
})

test('a backup carries the lock settings (hash only) and the lock flag', async ({
  page,
}) => {
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  const rows = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const tx = open.result.transaction(['settings', 'pages'], 'readonly')
          const out: unknown[] = []
          tx.objectStore('settings').getAll().onsuccess = (e) =>
            out.push((e.target as IDBRequest).result)
          tx.objectStore('pages').getAll().onsuccess = (e) =>
            out.push((e.target as IDBRequest).result)
          tx.oncomplete = () => resolve(JSON.stringify(out))
        }
      }),
  )
  expect(rows).toContain('lock.config')
  expect(rows).toContain('"locked":true')
  expect(rows).not.toContain('4821')
})

test('a phone-width lock screen fits, in Day, Night and Sepia', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await start(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  for (const theme of ['night', 'sepia', 'day']) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t
    }, theme)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflow, theme).toBe(false)
    await expect(lockScreen(page)).toBeVisible()
    await page.screenshot({ path: `test-results/lock-${theme}.png` })
  }
})
