import { expect, test, type Page } from '@playwright/test'
import { cornerAction } from './helpers.ts'

/**
 * Polish 2, items 1 and 2: the first-run welcome (three steps) and the
 * Start here sample notebook. These start on a brand-new device.
 */

test.use({ storageState: { cookies: [], origins: [] } })

const welcome = (page: Page) => page.getByTestId('welcome')
const stored = (page: Page, key: string) =>
  page.evaluate((k) => localStorage.getItem('learning-notes:' + k), key)

test('a first visit shows the welcome; Skip writes nothing else and it never returns', async ({
  page,
}) => {
  await page.goto('/')
  await expect(welcome(page)).toBeVisible()
  await expect(welcome(page)).toContainText('How will you write?')
  await welcome(page).getByRole('button', { name: 'Skip' }).click()
  await expect(welcome(page)).toHaveCount(0)
  expect(await stored(page, 'onboarding.done')).toBe('true')
  // Skip chose nothing: no tool-bar layout, no language, no theme.
  expect(await stored(page, 'toolbar.main')).toBeNull()
  expect(await stored(page, 'general.language')).toBeNull()
  // The device picker does not take over after a skip, and a reload is quiet.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('complementary')).toBeAttached()
  await expect(welcome(page)).toHaveCount(0)
})

test('three steps: Apple Pencil sets Pencil mode, then Start here opens the sample', async ({
  page,
}) => {
  await page.goto('/')
  await expect(welcome(page)).toBeVisible()
  await welcome(page)
    .getByRole('radio', { name: /Apple Pencil/ })
    .click()
  await welcome(page).getByRole('button', { name: 'Next' }).click()
  expect(await stored(page, 'general.deviceMode')).toBe('"pencil"')
  await expect(welcome(page)).toContainText('Language and theme')
  await welcome(page).getByRole('radio', { name: 'Night' }).click()
  await welcome(page).getByRole('button', { name: 'Next' }).click()
  await expect(welcome(page)).toContainText('Where do you want to start?')
  await welcome(page).locator('[data-start="sample"]').click()
  await expect(welcome(page)).toHaveCount(0)
  // The sample notebook opens at its first page.
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    '1. Write on paper',
  )
  await expect(page.locator('.bn-editor')).toContainText(
    'Try it: choose the Pen',
  )
  expect(await stored(page, 'onboarding.done')).toBe('true')
})

test('Settings can show the welcome again', async ({ page }) => {
  await page.goto('/')
  await welcome(page).getByRole('button', { name: 'Skip' }).click()
  await cornerAction(page, 'Settings')
  await page.getByRole('button', { name: 'Show the welcome again' }).click()
  await expect(welcome(page)).toBeVisible()
  await welcome(page).getByRole('button', { name: 'Skip' }).click()
  await expect(welcome(page)).toHaveCount(0)
})
