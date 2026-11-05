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
 * Batch 2d, step 1: the control panel, a search over every feature and
 * setting. Opened with Ctrl/Cmd+Shift+K (Ctrl/Cmd+K stays the page search),
 * the bar's search icon, the page ⋯ menu and Settings.
 */

const panel = (page: Page) =>
  page.getByRole('dialog', { name: 'Search all features' })
const box = (page: Page) =>
  panel(page).getByRole('searchbox', { name: 'Search features and settings' })

async function start(page: Page, mode: 'computer' | 'touch' = 'computer') {
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

test('Ctrl+Shift+K opens it, Ctrl+K still opens the page search', async ({
  page,
}) => {
  await start(page)
  await page.keyboard.press('Control+Shift+K')
  await expect(panel(page)).toBeVisible()
  await expect(box(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
  await openSearchPopup(page)
  await expect(panel(page)).toHaveCount(0)
})

test('lists every tab and setting, searches by name, place and English', async ({
  page,
}) => {
  await start(page)
  await page.keyboard.press('Control+Shift+K')
  const dialog = panel(page)
  for (const heading of [
    'File',
    'Home',
    'Insert',
    'Draw',
    'View',
    'Review',
    'Settings',
  ]) {
    await expect(
      dialog.getByRole('heading', { name: heading, level: 3, exact: true }),
      heading,
    ).toBeVisible()
  }
  await box(page).fill('paste')
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

test('running a row does the action: a setting opens in Settings', async ({
  page,
}) => {
  await start(page)
  await page.keyboard.press('Control+Shift+K')
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
  await page.keyboard.press('Control+Shift+K')
  await box(page).fill('bold')
  await panel(page)
    .locator('[data-panel-row="tool:bold"] [data-panel-run]')
    .click()
  await expect(
    page.locator('.bn-editor strong, .bn-editor b').first(),
  ).toContainText('nucleus')
  // A tool that is not built yet says so.
  await page.keyboard.press('Control+Shift+K')
  await box(page).fill('fountain pen')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('later update')
})

test('keyboard: arrows move through rows, Tab reaches Pin, Esc closes and returns focus', async ({
  page,
}) => {
  await start(page)
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+Shift+K')
  await box(page).fill('heading')
  const runs = panel(page).locator('[data-panel-run]')
  await page.keyboard.press('ArrowDown')
  await expect(runs.first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(runs.nth(1)).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect(box(page)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Tab')
  await expect(
    panel(page).getByRole('button', { name: /^Pin Heading 1 to the bar/ }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
  await expect(page.locator('.bn-editor')).toBeFocused()
})

test('dialog semantics: modal, labelled, focus stays inside', async ({
  page,
}) => {
  await start(page)
  await page.keyboard.press('Control+Shift+K')
  await expect(panel(page)).toHaveAttribute('aria-modal', 'true')
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
  const inside = await page.evaluate(
    () => !!document.activeElement?.closest('[role="dialog"]'),
  )
  expect(inside).toBe(true)
  await expect(panel(page).getByRole('button', { name: 'Close' })).toBeVisible()
})

test('Pin to bar adds the tool to the bar; again removes it', async ({
  page,
}) => {
  await start(page, 'touch')
  await page.keyboard.press('Control+Shift+K')
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
  await page.keyboard.press('Control+Shift+K')
  await box(page).fill('heading 1')
  await panel(page)
    .getByRole('button', { name: /^Remove Heading 1 from the bar/ })
    .click()
  await page.keyboard.press('Escape')
  await expect(
    dockedBar(page).getByRole('button', { name: 'Heading 1' }),
  ).toHaveCount(0)
})

test('opens from the bar search icon, the page menu and Settings', async ({
  page,
}) => {
  await start(page, 'touch')
  await dockedBar(page).getByRole('button', { name: 'Toolbar menu' }).click()
  await page.getByRole('button', { name: 'Search all features' }).click()
  await expect(panel(page)).toBeVisible()
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
  await page.keyboard.press('Control+Shift+K')
  const rows = await panel(page).locator('[data-panel-row^="tool:"]').count()
  // 80 are shown at most; narrowing shows the rest.
  expect(rows).toBeGreaterThan(40)
  await box(page).fill('mind map')
  await expect(
    panel(page).locator('[data-panel-row="tool:mindMap"]'),
  ).toBeVisible()
})
