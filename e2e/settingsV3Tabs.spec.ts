// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 page tabs and the template picker: SET-B28 to B31. */

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

const V3 = '/?flags=settings.v3#/settings/general'
const tabs = (page: Page) =>
  page.locator('[data-page-tabs-preview] [role="tab"]')

async function open(page: Page) {
  await page.goto(V3)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(
    page.locator('[data-setting-id="general.pageTabs"]'),
  ).toBeVisible()
}

test('SET-B28 three tabs at first; add one; the row stays one line', async ({
  page,
}) => {
  await open(page)
  await expect(tabs(page)).toHaveText(['Page', 'Summary', 'Cards'])
  await page
    .locator('[data-page-tabs-preview] [data-testid=tabrow-plus]')
    .click()
  await page.getByTestId('tabrow-add').first().click()
  await expect(tabs(page)).toHaveCount(4)
  const rects = await tabs(page).evaluateAll((els) =>
    els.map((e) => Math.round(e.getBoundingClientRect().top)),
  )
  expect(new Set(rects).size).toBe(1)
  // The same stored value as today: the optional tab is the device default.
  const stored = await page.evaluate(() =>
    localStorage.getItem('learning-notes:pageTabs.default'),
  )
  expect(stored).toContain('mindMap')
})

test('SET-B28 rename and remove with the tab editor', async ({ page }) => {
  await open(page)
  await page
    .locator('[data-page-tabs-preview] [data-testid=tabrow-plus]')
    .click()
  await page.getByTestId('tabrow-edit').click()
  const name = page.getByTestId('tabed-row').nth(1).getByRole('textbox')
  await name.fill('Digest')
  await name.press('Enter')
  await page.getByTestId('tabed-done').click()
  await expect(tabs(page).nth(1)).toHaveText('Digest')
  await page
    .locator('[data-page-tabs-preview] [data-testid=tabrow-plus]')
    .click()
  await page.getByTestId('tabrow-edit').click()
  await page.getByTestId('tabed-remove').first().click()
  await page.getByTestId('tabed-done').click()
  await expect(tabs(page)).toHaveCount(2)
})

test('SET-B29 the tab row itself is the small preview, right at the row', async ({
  page,
}) => {
  await open(page)
  const row = page.locator('[data-setting-id="general.pageTabs"]')
  await expect(row.locator('[data-page-tabs-preview]')).toContainText(
    'Preview of the tab row',
  )
  await expect(row.locator('[role="tablist"]')).toBeVisible()
})

test('SET-B30 up / down buttons reorder, and Undo restores the order', async ({
  page,
}) => {
  await open(page)
  await page
    .locator('[data-page-tabs-preview] [data-testid=tabrow-plus]')
    .click()
  await page.getByTestId('tabrow-edit').click()
  await page.getByRole('button', { name: 'Move Cards up' }).click()
  await expect(
    page.getByTestId('tabed-row').nth(1).getByRole('textbox'),
  ).toHaveValue('Cards')
  await page.getByTestId('tabed-undo').click()
  await expect(
    page.getByTestId('tabed-row').nth(1).getByRole('textbox'),
  ).toHaveValue('Summary')
  await page.getByTestId('tabed-done').click()
})

test('SET-B31 Beginner: "Choose a template" offers Blank and Study notes and sets the same value', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    ),
  )
  await page.goto(V3)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  const row = page.locator('[data-setting-id="general.newPageStudy"]')
  await expect(row).toBeVisible()
  await row.locator('[data-choose-template]').click()
  const picker = page.getByTestId('sv3-template-picker')
  await expect(picker.locator('[data-template]')).toHaveCount(2)
  await picker.locator('[data-template="study"]').click()
  await expect(picker).toHaveCount(0)
  await expect(row.getByRole('radio', { name: 'On' })).toBeChecked()
})

test('SET-B31 Professional: every template is listed and searchable; the ✕ clears', async ({
  page,
}) => {
  await page.goto(V3)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  const row = page.locator('[data-setting-id="general.newPageStudy"]')
  await row.locator('[data-choose-template]').click()
  const picker = page.getByTestId('sv3-template-picker')
  expect(await picker.locator('[data-template]').count()).toBeGreaterThan(2)
  await picker.getByRole('searchbox').fill('zzz')
  await expect(picker).toContainText('No template matches')
  await picker.getByRole('button', { name: /clear/i }).click()
  expect(await picker.locator('[data-template]').count()).toBeGreaterThan(2)
  await page.keyboard.press('Escape')
  await expect(picker).toHaveCount(0)
})

test('SET-B31 a template that cannot be the start page yet is tappable and explains why in a pop-up', async ({
  page,
}) => {
  await page.goto(V3)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  const row = page.locator('[data-setting-id="general.newPageStudy"]')
  const before = await row.getByRole('radio', { name: 'On' }).isChecked()
  await row.locator('[data-choose-template]').click()
  const picker = page.getByTestId('sv3-template-picker')
  const other = picker
    .locator(
      '[data-template]:not([data-template="blank"]):not([data-template="study"])',
    )
    .first()
  await expect(other).toBeEnabled()
  const name = (await other.locator('.sv3-row-name').innerText()).trim()
  await other.click()
  const why = page.getByTestId('sv3-template-why')
  await expect(why).toBeVisible()
  await expect(why).toContainText(name)
  await expect(why).toContainText('cannot be the start page yet')
  // The pop-up closes with Esc and nothing was saved.
  await page.keyboard.press('Escape')
  await expect(why).toHaveCount(0)
  await expect(row.getByRole('radio', { name: 'On' })).toBeChecked({
    checked: before,
  })
})
