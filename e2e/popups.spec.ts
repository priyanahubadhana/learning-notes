// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * The one pop-up rule: every pop-up, menu and tray stays open only until the
 * user chooses something, taps outside, switches ribbon tab or opens another
 * pop-up, presses Esc, or navigates or scrolls the page. Each has a visible
 * ✕ (44 px, "Close"). Only one is open at a time.
 */

test.use({ viewport: { width: 1000, height: 1180 }, hasTouch: true })

const tray = (page: Page) => page.locator('[data-bar="tray"]')
const more = (page: Page) =>
  dockedBar(page).locator('[data-action="more"]').first()
const menuButton = (page: Page) =>
  dockedBar(page).locator('[data-action="toolbarMenu"]')
const allTools = (page: Page) =>
  dockedBar(page).getByRole('button', { name: 'All tools', exact: true })
const tab = (page: Page, name: string) =>
  dockedBar(page).getByRole('tab', { name, exact: true })

async function openPage(page: Page, lines = 1) {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  for (let i = 1; i < lines; i++) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Line number ${i}`)
  }
  await page.waitForTimeout(500)
}

test('More closes on a tap outside, on Esc, and with its ✕', async ({
  page,
}) => {
  await openPage(page)
  await more(page).click()
  await expect(tray(page)).toBeVisible()
  await page.locator('.bn-editor').click()
  await expect(tray(page)).toHaveCount(0)

  await more(page).click()
  await expect(tray(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tray(page)).toHaveCount(0)

  await more(page).click()
  const close = tray(page).getByRole('button', { name: 'Close', exact: true })
  await expect(close).toBeVisible()
  const size = (await close.boundingBox())!
  expect(size.width).toBeGreaterThanOrEqual(43.5)
  expect(size.height).toBeGreaterThanOrEqual(43.5)
  await close.click()
  await expect(tray(page)).toHaveCount(0)
})

test('its own button toggles it', async ({ page }) => {
  await openPage(page)
  await more(page).click()
  await expect(tray(page)).toBeVisible()
  await more(page).click()
  await expect(tray(page)).toHaveCount(0)
})

test('More closes when a ribbon tab is tapped (the old bug: it stayed open)', async ({
  page,
}) => {
  await openPage(page)
  await allTools(page).click()
  // Home › More formatting opens the long list.
  await dockedBar(page)
    .getByRole('tabpanel')
    .getByRole('button', { name: 'More formatting', exact: true })
    .click()
  await expect(tray(page)).toBeVisible()
  await tab(page, 'View').click()
  await expect(tray(page)).toHaveCount(0)
  // And Settings: a tap on another screen's button closes a tray too.
  await tab(page, 'Home').click()
  await dockedBar(page)
    .getByRole('tabpanel')
    .getByRole('button', { name: 'More formatting', exact: true })
    .click()
  await expect(tray(page)).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(tray(page)).toHaveCount(0)
})

test('only one pop-up is open at a time', async ({ page }) => {
  await openPage(page)
  await more(page).click()
  await expect(tray(page)).toHaveCount(1)
  await menuButton(page).click()
  await expect(tray(page)).toHaveCount(1)
  await expect(tray(page)).toHaveAttribute('aria-label', 'Toolbar menu')
  // The page ⋯ menu is another pop-up: it closes the tray.
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(tray(page)).toHaveCount(0)
})

test('scrolling the page closes it', async ({ page }) => {
  await openPage(page, 60)
  await more(page).click()
  await expect(tray(page)).toBeVisible()
  await page.waitForTimeout(600) // the page settling is not a scroll
  // A real scroll by the user (the mouse wheel) over the page.
  await page.mouse.move(500, 700)
  await page.mouse.wheel(0, 600)
  await expect(tray(page)).toHaveCount(0)
})

test('the colour picker closes with ✕, outside, Esc, and after a colour is chosen', async ({
  page,
}) => {
  await openPage(page)
  const colors = dockedBar(page).locator('button[data-action="color"]')
  await colors.click()
  await expect(tray(page).getByText('Text color')).toBeVisible()
  await tray(page).getByRole('button', { name: 'Close', exact: true }).click()
  await expect(tray(page)).toHaveCount(0)

  await colors.click()
  await page.locator('.bn-editor').click()
  await expect(tray(page)).toHaveCount(0)

  await colors.click()
  await page.keyboard.press('Escape')
  await expect(tray(page)).toHaveCount(0)

  await colors.click()
  await tray(page).locator('[data-color="textColor:red"]').click()
  await expect(tray(page)).toHaveCount(0)
})

test('the ⋯ Toolbar menu has a ✕ and closes on a choice', async ({ page }) => {
  await openPage(page)
  await menuButton(page).click()
  await expect(tray(page)).toBeVisible()
  await tray(page).getByRole('button', { name: 'Close', exact: true }).click()
  await expect(tray(page)).toHaveCount(0)
  await menuButton(page).click()
  await tray(page).getByRole('button', { name: 'Copy as plain text' }).click()
  await expect(tray(page)).toHaveCount(0)
})

test('the page ⋯ menu has a ✕ and closes on a tap outside, Esc and a choice', async ({
  page,
}) => {
  await openPage(page)
  const open = page.getByRole('button', { name: 'More options' })
  await open.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(menu).toHaveCount(0)
  await open.click()
  await page.locator('.bn-editor').click({ position: { x: 5, y: 5 } })
  await expect(menu).toHaveCount(0)
  await open.click()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
})

test('the ribbon "Tools close after use" panel closes on a tap outside, Esc and a scroll', async ({
  page,
}) => {
  await openPage(page, 60)
  await allTools(page).click()
  const panel = dockedBar(page).getByRole('tabpanel')
  await expect(panel).toBeVisible()
  await page.locator('.bn-editor').click({ position: { x: 5, y: 40 } })
  await expect(panel).toHaveCount(0)

  await tab(page, 'Home').click()
  await expect(panel).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)

  await tab(page, 'Home').click()
  await expect(panel).toBeVisible()
  await page.waitForTimeout(600)
  // A real scroll by the user (the mouse wheel) over the page.
  await page.mouse.move(500, 700)
  await page.mouse.wheel(0, 600)
  await expect(panel).toHaveCount(0)
})

test('"Tools stay open" never closes by itself', async ({ page }) => {
  await openPage(page)
  await allTools(page).click()
  await dockedBar(page).locator('[data-action="ribbonBehaviour"]').click()
  await page.locator('.bn-editor').click()
  await expect(dockedBar(page).getByRole('tabpanel')).toBeVisible()
})

test('Copy & paste is ONE button at the end of Home with a small menu', async ({
  page,
}) => {
  await openPage(page)
  await allTools(page).click()
  const panel = dockedBar(page).getByRole('tabpanel')
  const groups = panel.getByRole('group')
  const last = groups.last()
  await expect(last).toHaveAttribute('aria-label', 'Copy & paste')
  const button = last.getByRole('button', { name: 'Copy & paste' })
  await expect(button).toHaveCount(1)
  await button.click()
  const menu = page.getByRole('menu', { name: 'Copy & paste' })
  await expect(menu.getByRole('menuitem')).toHaveText([
    /Copy as plain text/,
    /Copy as Markdown/,
    /Copy page with pictures/,
    /Paste as plain text/,
  ])
  await menu.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(menu).toHaveCount(0)
  // The panel stays open under its menu (the menu belongs to it).
  await expect(panel).toBeVisible()
  await last.getByRole('button', { name: 'Copy & paste' }).click()
  await menu.getByRole('menuitem', { name: /Copy as plain text/ }).click()
  await expect(menu).toHaveCount(0)
})

test('Home follows the Google Docs order, with the old Clipboard group gone', async ({
  page,
}) => {
  await openPage(page)
  await allTools(page).click()
  const labels = await dockedBar(page)
    .getByRole('tabpanel')
    .getByRole('group')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(labels).toEqual([
    'Undo & redo',
    'Text style',
    'Font & size',
    'Format',
    'Colors',
    'Lists & alignment',
    'More formatting',
    'Copy & paste',
  ])
})

test('the theme list: a ▾ beside Theme, with swatches and a tick; the Theme button still cycles', async ({
  page,
}) => {
  await openPage(page)
  await allTools(page).click()
  await tab(page, 'View').click()
  const panel = dockedBar(page).getByRole('tabpanel')
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'day')

  // One tap on the Theme button cycles, exactly as before.
  await panel.getByRole('button', { name: 'Theme', exact: true }).click()
  await expect(html).toHaveAttribute('data-theme', 'night')
  await tab(page, 'View').click()

  // The arrow opens the list.
  await panel.getByRole('button', { name: 'Choose a theme' }).click()
  const list = page.getByRole('menu', { name: 'Choose a theme' })
  await expect(list.getByRole('menuitemradio')).toHaveCount(3)
  await expect(
    list.getByRole('menuitemradio', { name: /Night/ }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(
    list.locator('[data-theme-option="sepia"] [aria-hidden]').first(),
  ).toBeVisible()
  await list.getByRole('menuitemradio', { name: /Sepia/ }).click()
  await expect(html).toHaveAttribute('data-theme', 'sepia')
  await expect(list).toHaveCount(0)

  // A choice closes the ribbon's tools too ("Tools close after use").
  await expect(panel).toHaveCount(0)
  // ✕ and a tap outside close it (the tools stay under their menu).
  await tab(page, 'View').click()
  await panel.getByRole('button', { name: 'Choose a theme' }).click()
  await list.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(list).toHaveCount(0)
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: 'Choose a theme' }).click()
  await page.locator('.bn-editor').click({ position: { x: 5, y: 5 } })
  await expect(list).toHaveCount(0)
})

test('the theme ▾ is on the short bar Read set too', async ({ page }) => {
  await openPage(page)
  await dockedBar(page).getByRole('radio', { name: 'Read' }).click()
  await dockedBar(page).getByRole('button', { name: 'Choose a theme' }).click()
  await page
    .getByRole('menu', { name: 'Choose a theme' })
    .getByRole('menuitemradio', { name: /Night/ })
    .click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
})
