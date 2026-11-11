// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  pageAction,
  startInMode,
  typeInEditor,
  openRibbon,
  cornerAction,
} from './helpers.ts'

/**
 * Turning the tool bar off is never silent and never a dead end: a confirm
 * dialog says where to turn it back on, a message offers Undo, Settings has a
 * Tool bar section, and a "Show tool bar" button stays in the top bar.
 */

test.use({ viewport: { width: 1000, height: 1180 }, hasTouch: true })

const bar = (page: Page) => dockedBar(page)
const showButton = (page: Page) => page.getByTestId('show-tool-bar')
const dialog = (page: Page) => page.getByRole('dialog')

async function openPage(page: Page, mode: 'touch' | 'pencil' = 'touch') {
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

test('the page ⋯ menu asks first; Cancel keeps the bar', async ({ page }) => {
  await openPage(page)
  await pageAction(page, 'Hide tool bar')
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page)).toContainText('page ⋯ menu › Show tool bar')
  await expect(dialog(page)).toContainText('Settings › Tool bar')
  await expect(dialog(page).getByRole('button')).toHaveText([
    'Cancel',
    'Turn off',
  ])
  await dialog(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(bar(page)).toBeVisible()
  await expect(showButton(page)).toHaveCount(0)
})

test('Esc on the question also keeps the bar', async ({ page }) => {
  await openPage(page)
  await pageAction(page, 'Hide tool bar')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  await expect(bar(page)).toBeVisible()
})

test('Turn off hides the bar, shows a message with Undo, and keeps a Show tool bar button in the top bar', async ({
  page,
}) => {
  await openPage(page)
  await pageAction(page, 'Hide tool bar')
  await dialog(page).getByRole('button', { name: 'Turn off' }).click()
  await expect(bar(page)).toHaveCount(0)
  const toast = page
    .getByRole('status')
    .filter({ hasText: 'Tool bar turned off' })
  await expect(toast).toBeVisible()
  await expect(showButton(page)).toBeVisible()
  await expect(showButton(page)).toHaveText('Show tool bar')
  // Undo brings it back at once.
  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(bar(page)).toBeVisible()
  await expect(showButton(page)).toHaveCount(0)
})

test('the Show tool bar button in the top bar turns it back on (also on other screens)', async ({
  page,
}) => {
  await openPage(page)
  await pageAction(page, 'Hide tool bar')
  await dialog(page).getByRole('button', { name: 'Turn off' }).click()
  await cornerAction(page, 'Settings')
  await expect(showButton(page)).toBeVisible()
  await showButton(page).click()
  await expect(showButton(page)).toHaveCount(0)
  // The bar is on again where it was (Top): open a page to see it.
  await page.getByRole('button', { name: 'First', exact: true }).first().click()
  await expect(bar(page)).toBeVisible()
})

test('the page ⋯ menu "Show tool bar" turns it on', async ({ page }) => {
  await openPage(page)
  await pageAction(page, 'Hide tool bar')
  await dialog(page).getByRole('button', { name: 'Turn off' }).click()
  await pageAction(page, 'Show tool bar')
  await expect(bar(page)).toBeVisible()
})

test('the ribbon tool "Tool bar on or off" asks too', async ({ page }) => {
  await openPage(page)
  await openRibbon(page)
  await bar(page).getByRole('tab', { name: 'View', exact: true }).click()
  await bar(page)
    .getByRole('tabpanel')
    .getByRole('button', { name: 'Tool bar on or off' })
    .click()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(bar(page)).toBeVisible()
})

test('Settings has a Tool bar section: searching "tool bar", "toolbar", "ribbon" and "bar" finds it', async ({
  page,
}) => {
  await openPage(page)
  await cornerAction(page, 'Settings')
  const search = page.getByRole('searchbox', { name: /Search/ })
  for (const word of ['Tool bar', 'toolbar', 'ribbon', 'bar']) {
    await search.fill(word)
    await expect(
      page.getByRole('heading', { name: 'Show tool bar' }),
      word,
    ).toBeVisible()
    await expect(page.getByText(/No settings match/)).toHaveCount(0)
  }
  // The category lists everything asked for.
  await search.fill('')
  await page.getByRole('button', { name: /^Tool bar, / }).click()
  for (const heading of [
    'Show tool bar',
    'Tool bar layout',
    'Ribbon tools',
    'Ribbon display',
    'Ribbon size',
    'Ribbon position',
    'Edit bar (tools and options)',
    'Device mode',
    'Formatting bar position',
    'Auto switch',
    'Reset tool bar',
  ]) {
    await expect(
      page.getByRole('heading', {
        name: new RegExp('^' + heading.replace(/[()]/g, '\\$&')),
      }),
      heading,
    ).toBeVisible()
  }
})

test('Settings › Tool bar › Show tool bar: Off asks first, On brings it back', async ({
  page,
}) => {
  await openPage(page)
  await cornerAction(page, 'Settings')
  await page.getByRole('button', { name: /^Tool bar, / }).click()
  const row = page.locator('[data-setting-id="toolbar.show"]')
  await row.getByRole('button', { name: 'Off', exact: true }).click()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Turn off' }).click()
  await expect(
    row.getByRole('button', { name: 'Off', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await row.getByRole('button', { name: 'On', exact: true }).click()
  await expect(
    row.getByRole('button', { name: 'On', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(showButton(page)).toHaveCount(0)
})

test('Reset tool bar in Settings puts the standard tools and positions back', async ({
  page,
}) => {
  await openPage(page)
  await openRibbon(page)
  await cornerAction(page, 'Settings')
  await page.getByRole('button', { name: /^Tool bar, / }).click()
  await page
    .locator('[data-setting-id="toolbar.reset"]')
    .getByRole('button', { name: 'Reset tool bar' })
    .click()
  const layout = page.locator('[data-setting-id="toolbar.layout"]')
  await expect(
    layout.getByRole('button', { name: 'Short bar' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('the control panel finds the new settings', async ({ page }) => {
  await openPage(page)
  await page.keyboard.press('Control+Shift+K')
  const panel = page.getByRole('dialog', { name: 'Search' })
  await panel.getByRole('button', { name: 'Features' }).click()
  await panel
    .getByRole('combobox', { name: 'Search everything' })
    .fill('ribbon')
  for (const name of ['Ribbon display', 'Ribbon size', 'Ribbon position']) {
    await expect(panel.getByText(name, { exact: true }).first()).toBeVisible()
  }
})

test('on a Pencil iPad (Touch/Pencil) the bar is visible with a way back, in both orientations', async ({
  page,
}) => {
  await openPage(page, 'pencil')
  await expect(bar(page)).toBeVisible()
  await page.setViewportSize({ width: 1180, height: 820 })
  await expect(bar(page)).toBeVisible()
  // The device picker lands on Pencil with the bar showing; turn off and back.
  await pageAction(page, 'Hide tool bar')
  await dialog(page).getByRole('button', { name: 'Turn off' }).click()
  await expect(showButton(page)).toBeVisible()
  await showButton(page).click()
  await expect(bar(page)).toBeVisible()
})
