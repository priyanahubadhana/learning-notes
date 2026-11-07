import { expect, test, type Page } from '@playwright/test'
import { createNotebook, rowAction } from './helpers.ts'

/** Polish 1 · item 10: kinder defaults for decks and memory pages. */

const editor = (page: Page) => page.locator('.bn-editor')
const dialog = (page: Page) => page.getByRole('dialog')

test('Settings › Review shows about how many minutes the new-card limit takes', async ({
  page,
}) => {
  await page.goto('/#/settings/review')
  const hint = page.getByTestId('time-hint')
  // 20 new cards a day at the assumed 8 seconds each is about 3 minutes.
  await expect(hint).toHaveText('About 3 min a day at your pace.')
})

test('a new PAO page shows a grey worked example', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Palaces', 'First')
  await rowAction(page, 'Palaces', 'Add page')
  await page.getByRole('menuitem', { name: 'From template…' }).click()
  await dialog(page)
    .getByRole('button', { name: /^PAO table/ })
    .click()
  const example = editor(page).getByText(/^Example:/)
  await expect(example).toBeVisible()
  await expect(example).toContainText('James Bond')
})
