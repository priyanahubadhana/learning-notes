// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, openPage, typeInEditor } from './helpers.ts'
import {
  enterCode,
  lockScreen,
  lockThisPage,
  openLockedPage,
  openLockSettings,
  setCode,
} from './lockHelpers.ts'

/** Slice 11a (flag security.m1): growing wait after wrong lock codes, with a live countdown. */

const KEY = 'learning-notes:lock-throttle-v1'
const code = (p: Page) => p.locator('#unlock-code')

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('m1-seeded')) {
      localStorage.setItem('learning-notes:flags', '["security.m1"]')
      sessionStorage.setItem('m1-seeded', '1')
    }
  })
})

/** Three wrong tries, each checked before the next; ends in the wait. */
async function failThree(page: Page) {
  for (let i = 0; i < 3; i++) {
    await enterCode(page, '000000')
    await expect(code(page)).toHaveValue('')
  }
  await expect(code(page)).toBeDisabled()
}

async function locked(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await addPage(page, 'Diary', 'Private page')
  await typeInEditor(page, 'secret')
  await openLockSettings(page)
  await setCode(page, 'PIN', '482193')
  await openPage(page, 'Private page')
  await lockThisPage(page)
}

test('S1 S2: two wrong tries wait nothing, the 3rd starts a live countdown', async ({
  page,
}) => {
  await locked(page)
  for (let i = 0; i < 2; i++) {
    await enterCode(page, '000000')
    await expect(lockScreen(page).getByRole('alert')).toContainText(
      'That is not right',
    )
    await expect(code(page)).toHaveValue('')
    await expect(code(page)).toBeEnabled()
  }
  await enterCode(page, '000000')
  await expect(lockScreen(page).getByRole('alert')).toContainText(
    /Try again in 0:\d\d/,
  )
  await expect(code(page)).toBeDisabled()
})

test('S2 S4 S6: countdown ends by itself, a reload keeps it, Forgot works while waiting', async ({
  page,
}) => {
  await locked(page)
  await failThree(page)
  await expect(code(page)).toBeDisabled()
  await page.reload()
  await openLockedPage(page, 'Private page')
  await expect(lockScreen(page).getByRole('alert')).toContainText(
    /Try again in 0:\d\d/,
  )
  await expect(
    lockScreen(page).getByRole('button', { name: 'Forgot?' }),
  ).toBeVisible()
  // Shorten the wait to 2 s: the field comes back by itself.
  await page.evaluate((k) => {
    const v = JSON.parse(localStorage.getItem(k) ?? '{}') as {
      failures: number
    }
    localStorage.setItem(
      k,
      JSON.stringify({ failures: v.failures, blockedUntil: Date.now() + 2000 }),
    )
  }, KEY)
  await expect(code(page)).toBeEnabled({ timeout: 8000 })
})

test('S5: the right code after a wait opens and clears the count', async ({
  page,
}) => {
  await locked(page)
  await failThree(page)
  await page.evaluate((k) => {
    localStorage.setItem(
      k,
      JSON.stringify({ failures: 3, blockedUntil: Date.now() + 1000 }),
    )
  }, KEY)
  await expect(code(page)).toBeEnabled({ timeout: 8000 })
  await enterCode(page, '482193')
  await expect(page.locator('.bn-editor')).toContainText('secret')
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull()
})
