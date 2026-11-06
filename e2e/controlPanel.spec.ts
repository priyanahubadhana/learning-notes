// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  openSearchPopup,
  pageAction,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Step 4a: the control panel is now the Features group (and chip) of the one
 * Search. Ctrl/Cmd+K and Ctrl/Cmd+Shift+K both open it, and so do the bar's
 * search icon, the page ⋯ menu and Settings.
 */

const panel = (page: Page) => page.getByRole('dialog', { name: 'Search' })
const box = (page: Page) =>
  panel(page).getByRole('combobox', { name: 'Search everything' })

/** Opens the one Search and picks the Features chip. */
async function features(page: Page) {
  await page.keyboard.press('Control+Shift+K')
  await panel(page).getByRole('button', { name: 'Features' }).click()
}

async function start(page: Page, mode: 'computer' | 'touch' = 'computer') {
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

test('Ctrl+K and Ctrl+Shift+K both open the one Search', async ({ page }) => {
  await start(page)
  await page.keyboard.press('Control+Shift+K')
  await expect(panel(page)).toBeVisible()
  await expect(box(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
  await openSearchPopup(page)
  await expect(panel(page)).toBeVisible()
})

test('Features: searches tools and settings by name, place and English', async ({
  page,
}) => {
  await start(page)
  await features(page)
  await box(page).fill('paste')
  const dialog = panel(page)
  const row = dialog.locator('[data-panel-row="tool:pastePlain"]')
  await expect(row).toBeVisible()
  await expect(row).toContainText('Paste as plain text')
  await expect(row).toContainText('Home › Clipboard') // where it lives
  await expect(row).toContainText(/Shift\+V/) // its shortcut
  await expect(dialog.getByRole('status')).toContainText(/\d+ result/)
  // A setting is found too, and says where it lives.
  await box(page).fill('auto switch')
  const setting = dialog.locator(
    '[data-panel-row="setting:advanced.autoSwitch"]',
  )
  await expect(setting).toContainText('Settings › Advanced')
  await box(page).fill('zzzzqqq')
  await expect(dialog.getByRole('status')).toHaveText('Nothing found.')
})

test('All shows a few features beside the notes that match', async ({
  page,
}) => {
  await start(page)
  await page.keyboard.press('Control+K')
  await box(page).fill('First')
  await expect(
    panel(page).getByRole('group', { name: 'Pages', exact: true }),
  ).toBeVisible()
  await box(page).fill('paste')
  await expect(
    panel(page).getByRole('group', { name: 'Features' }),
  ).toBeVisible()
  await expect(
    panel(page).locator('[data-panel-row="tool:pastePlain"]'),
  ).toBeVisible()
})

test('running a row does the action: a setting opens in Settings', async ({
  page,
}) => {
  await start(page)
  await features(page)
  await box(page).fill('auto switch')
  await page.keyboard.press('Enter')
  await expect(panel(page)).toHaveCount(0)
  await expect(
    page.locator('[data-setting-id="advanced.autoSwitch"]'),
  ).toBeVisible()
})

test('running a tool acts on the page; a missing page gets a message', async ({
  page,
}) => {
  await start(page)
  await page.evaluate(() => {
    const node = document.querySelector('.bn-editor p')!.firstChild!
    const range = document.createRange()
    range.setStart(node, 4)
    range.setEnd(node, 11)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  })
  await features(page)
  await box(page).fill('bold')
  await panel(page)
    .locator('[data-panel-row="tool:bold"] [data-panel-run]')
    .click()
  await expect(
    page.locator('.bn-editor strong, .bn-editor b').first(),
  ).toContainText('nucleus')
  // A tool that is not built yet says so.
  await features(page)
  await box(page).fill('magnifier')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('later update')
})

test('keyboard: arrows move through rows, Esc closes', async ({ page }) => {
  await start(page)
  await features(page)
  await box(page).fill('heading')
  const options = panel(page).getByRole('option')
  await page.keyboard.press('ArrowDown')
  await expect(options.first()).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect(options.first()).toHaveAttribute('aria-selected', 'false')
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
})

test('Pin to bar adds the tool to the bar; again removes it', async ({
  page,
}) => {
  await start(page, 'touch')
  await features(page)
  await box(page).fill('heading 1')
  const pin = panel(page).getByRole('button', {
    name: /^Pin Heading 1 to the bar/,
  })
  await expect(pin).toHaveAttribute('aria-pressed', 'false')
  await pin.click()
  await expect(
    panel(page).getByRole('button', { name: /^Remove Heading 1 from the bar/ }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(
    dockedBar(page).getByRole('button', { name: 'Heading 1' }),
  ).toBeVisible()
  // The bar's heading button works on the text.
  await dockedBar(page).getByRole('button', { name: 'Heading 1' }).click()
  await expect(
    page.locator('.bn-editor [data-content-type="heading"]'),
  ).toContainText('nucleus')
  // Pinning again removes it.
  await features(page)
  await box(page).fill('heading 1')
  await panel(page)
    .getByRole('button', { name: /^Remove Heading 1 from the bar/ })
    .click()
  await page.keyboard.press('Escape')
  await expect(
    dockedBar(page).getByRole('button', { name: 'Heading 1' }),
  ).toHaveCount(0)
})

test('opens from the bar search icon, the page menu and Settings (on Features)', async ({
  page,
}) => {
  await start(page, 'touch')
  await dockedBar(page).getByRole('button', { name: 'Toolbar menu' }).click()
  await page.getByRole('button', { name: 'Search all features' }).click()
  await expect(panel(page)).toBeVisible()
  await expect(
    panel(page).getByRole('button', { name: 'Features' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await pageAction(page, 'Search all features')
  await expect(panel(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto('/#/settings')
  await page.getByRole('button', { name: /^Search all features/ }).click()
  await expect(panel(page)).toBeVisible()
})

test('a new tool needs only one line: every registry tool is searchable', async ({
  page,
}) => {
  await start(page)
  await features(page)
  const rows = await panel(page).locator('[data-panel-row^="tool:"]').count()
  expect(rows).toBeGreaterThan(40)
  await box(page).fill('mind map')
  await expect(
    panel(page).locator('[data-panel-row="tool:mindMap"]'),
  ).toBeVisible()
})
