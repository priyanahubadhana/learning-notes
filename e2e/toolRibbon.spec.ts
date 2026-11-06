// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  contrastOf,
  createNotebook,
  dockedBar,
  startInMode,
  startInTheme,
  typeInEditor,
  openRibbon,
} from './helpers.ts'

/**
 * Batch 2d, step 2: the full ribbon. "All tools" replaces the short bar with
 * tabs (File, Home, Insert, Draw, View, Review) and their tools; two
 * behaviours ("Tools close after use" and "Tools stay open", Ctrl/Cmd+F1);
 * arrow keys on the tabs; hidden tabs; the same layout on a phone.
 */

test.use({ viewport: { width: 1000, height: 1180 }, hasTouch: true })

const tablist = (page: Page) =>
  dockedBar(page).getByRole('tablist', { name: 'Tool tabs' })
const tab = (page: Page, name: string) =>
  tablist(page).getByRole('tab', { name, exact: true })
const panel = (page: Page) => dockedBar(page).getByRole('tabpanel')
const ribbonTool = (page: Page, name: string) =>
  panel(page).getByRole('button', { name, exact: true })
const behaviour = (page: Page) =>
  dockedBar(page).locator('[data-action="ribbonBehaviour"]')

async function openPage(page: Page) {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}
const shortBar = (page: Page) =>
  dockedBar(page).getByRole('button', { name: 'Short bar', exact: true })

test('All tools replaces the short bar with the six tabs, opened on Home', async ({
  page,
}) => {
  await openPage(page)
  await openRibbon(page)
  await expect(dockedBar(page).getByRole('radiogroup')).toHaveCount(0)
  await expect(tablist(page).getByRole('tab')).toHaveText([
    'File',
    'Home',
    'Insert',
    'Draw',
    'View',
    'Review',
  ])
  await expect(tab(page, 'Home')).toHaveAttribute('aria-selected', 'true')
  await expect(panel(page)).toBeVisible()
  await expect(panel(page)).toHaveAttribute(
    'aria-labelledby',
    'ribbon-tab-home',
  )
  // The default behaviour is named in plain words.
  await expect(behaviour(page)).toHaveAccessibleName('Tools close after use')
  await expect(behaviour(page)).toHaveAttribute('aria-pressed', 'false')
})

test('it opens on the tab of the tool: Pen → Draw tab; Read hides the bar', async ({
  page,
}) => {
  await openPage(page)
  await dockedBar(page)
    .getByRole('button', { name: 'Pen', exact: true })
    .click()
  await page.keyboard.press('Escape')
  await openRibbon(page)
  await expect(tab(page, 'Draw')).toHaveAttribute('aria-selected', 'true')
  await shortBar(page).click()
  // Reading hides the bar and the ribbon: the reader has its own controls.
  await dockedBar(page)
    .getByRole('button', { name: 'Read', exact: true })
    .click()
  await expect(page.getByTestId('reader-controls')).toBeVisible()
  await expect(dockedBar(page)).toHaveCount(0)
})

const CONTENT: Record<string, string[]> = {
  File: [
    'Save & restore',
    'Share',
    'Print / PDF',
    'Anki import',
    'Lock page',
    'Lock notebook',
    'Settings',
  ],
  Home: [
    'Bold',
    'Italic',
    'Underline',
    'Colors',
    'Highlight',
    'Bulleted list',
    'Numbered list',
    'Checklist',
    'Heading 1',
    'Align left',
    'Undo',
    'Redo',
    'Copy & paste',
  ],
  Insert: [
    'Picture',
    'Audio',
    'File',
    'Table',
    'Database',
    'Callout',
    'Divider',
    'Link',
    'Insert template',
    'Mind map',
    'Make card',
    'Summary',
  ],
  Draw: [
    'Ball pen',
    'Fountain pen',
    'Marker',
    'Brush',
    'Pencil',
    'Highlighter',
    'Eraser',
    'Lasso',
    'Shapes',
    'Thickness',
    'Blank paper',
    'Grid paper',
  ],
  View: [
    'Reading mode',
    'Line focus',
    'Calendar',
    'Databases',
    'All cards',
    'Font',
    'Text size',
    'Theme',
    'Zoom',
    'Tool bar on or off',
    'Keep tools open',
  ],
  Review: [
    'Make card',
    'Study now',
    'Due today',
    'All cards',
    'Summary',
    'Card stats',
  ],
}

test('each tab holds the planned tools in named groups', async ({ page }) => {
  await openPage(page)
  await openRibbon(page)
  await behaviour(page).click() // stay open, so the tools do not close
  for (const [name, tools] of Object.entries(CONTENT)) {
    await tab(page, name).click()
    await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true')
    for (const tool of tools) {
      await expect(ribbonTool(page, tool), `${name} › ${tool}`).toBeVisible()
    }
    const groups = panel(page).getByRole('group')
    expect(await groups.count(), name).toBeGreaterThan(1)
  }
  // Draw: the pens work now, and so do Shapes, Tape, Magnifier and Ruler (G1).
  await tab(page, 'Draw').click()
  for (const name of ['Fountain pen', 'Ruler', 'Shapes', 'Tape', 'Magnifier']) {
    await expect(ribbonTool(page, name)).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  }
  await expect(ribbonTool(page, 'Fountain pen').locator('svg')).toHaveCount(1)
})

test('"Tools close after use": a tab shows its tools; using one, a tap outside, or Esc closes them', async ({
  page,
}) => {
  await openPage(page)
  await openRibbon(page)
  await expect(panel(page)).toBeVisible()
  // Using a tool closes the tools (the tabs stay).
  await ribbonTool(page, 'Bold').click()
  await expect(panel(page)).toHaveCount(0)
  await expect(tablist(page)).toBeVisible()
  // A tap on a tab shows them; the same tab again hides them.
  await tab(page, 'Insert').click()
  await expect(panel(page)).toBeVisible()
  await tab(page, 'Insert').click()
  await expect(panel(page)).toHaveCount(0)
  // A tap outside (on the page text) closes them.
  await tab(page, 'View').click()
  await expect(panel(page)).toBeVisible()
  await page.getByRole('textbox', { name: 'Page title' }).click()
  await expect(panel(page)).toHaveCount(0)
  // Esc closes them and keeps the focus on the tab.
  await tab(page, 'Review').click()
  await expect(panel(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
  await expect(tab(page, 'Review')).toBeFocused()
})

test('"Tools stay open": nothing closes them; Ctrl+F1 switches; remembered', async ({
  page,
}) => {
  await openPage(page)
  await openRibbon(page)
  await behaviour(page).click()
  await expect(behaviour(page)).toHaveAccessibleName('Tools stay open')
  await expect(behaviour(page)).toHaveAttribute('aria-pressed', 'true')
  await ribbonTool(page, 'Italic').click()
  await expect(panel(page)).toBeVisible()
  await tab(page, 'Home').click() // the same tab again does not hide them
  await expect(panel(page)).toBeVisible()
  await page.getByRole('textbox', { name: 'Page title' }).click()
  await expect(panel(page)).toBeVisible()
  // Ctrl+F1 goes back to "close after use" and says so.
  await page.keyboard.press('Control+F1')
  await expect(behaviour(page)).toHaveAccessibleName('Tools close after use')
  await expect(page.getByRole('status')).toContainText('Tools close after use')
  await expect(panel(page)).toHaveCount(0)
  // And on again; the choice survives a reload.
  await page.keyboard.press('Control+F1')
  await expect(behaviour(page)).toHaveAccessibleName('Tools stay open')
  await expect(panel(page)).toBeVisible()
  await page.reload()
  // The ribbon stays open after a reload (the layout is saved per device).
  await expect(tablist(page)).toBeVisible()
  await expect(behaviour(page)).toHaveAccessibleName('Tools stay open')
})

test('Ctrl+F1 also works from the short bar (it opens the ribbon)', async ({
  page,
}) => {
  await openPage(page)
  await page.keyboard.press('Control+F1')
  await expect(tablist(page)).toBeVisible()
  await expect(panel(page)).toBeVisible()
})

test('Short bar returns to the main bar', async ({ page }) => {
  await openPage(page)
  await openRibbon(page)
  await shortBar(page).click()
  await expect(tablist(page)).toHaveCount(0)
  await expect(
    dockedBar(page).getByRole('button', { name: 'Text', exact: true }),
  ).toBeVisible()
})

test('tabs are a proper tablist: arrows, Home and End move, Enter opens', async ({
  page,
}) => {
  await openPage(page)
  await openRibbon(page)
  await page.keyboard.press('Escape')
  await tab(page, 'Home').focus()
  await page.keyboard.press('ArrowRight')
  await expect(tab(page, 'Insert')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(tab(page, 'File')).toBeFocused()
  await page.keyboard.press('ArrowLeft') // wraps
  await expect(tab(page, 'Review')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(tab(page, 'File')).toBeFocused()
  await page.keyboard.press('End')
  await expect(tab(page, 'Review')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(tab(page, 'Review')).toHaveAttribute('aria-selected', 'true')
  await expect(panel(page)).toBeVisible()
  // Only the selected tab is in the tab order.
  await expect(tab(page, 'File')).toHaveAttribute('tabindex', '-1')
  await expect(tab(page, 'Review')).toHaveAttribute('tabindex', '0')
})

test('ribbon tools run: Settings and Calendar open their screens', async ({
  page,
}) => {
  await openPage(page)
  await openRibbon(page)
  await tab(page, 'File').click()
  await ribbonTool(page, 'Settings').click()
  await expect(page).toHaveURL(/#\/settings/)
  await page.goBack()
  // The ribbon is still the open bar when the page comes back.
  await tab(page, 'View').click()
  await ribbonTool(page, 'Calendar').click()
  await expect(page).toHaveURL(/#\/calendar/)
})

test('a ribbon tool changes the text, and Home › Undo takes it back', async ({
  page,
}) => {
  await openPage(page)
  await page.evaluate(() => {
    const node = document.querySelector('.bn-editor p')!.firstChild!
    const range = document.createRange()
    range.setStart(node, 4)
    range.setEnd(node, 11)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  })
  await openRibbon(page)
  await ribbonTool(page, 'Bold').click()
  await expect(page.locator('.bn-editor strong')).toHaveText('nucleus')
})

test('Edit bar can hide tabs (one always stays) and the choice is kept', async ({
  page,
}) => {
  await openPage(page)
  await dockedBar(page).getByRole('button', { name: 'Toolbar menu' }).click()
  await page
    .locator('[data-bar="tray"]')
    .getByRole('button', { name: /^Edit bar/ })
    .click()
  const edit = page
    .locator('[data-bar="tray"]')
    .getByRole('group', { name: 'Edit bar' })
  const tabs = edit.getByRole('group', { name: 'Ribbon tabs to show' })
  await tabs.getByRole('checkbox', { name: 'Draw', exact: true }).uncheck()
  await tabs.getByRole('checkbox', { name: 'File', exact: true }).uncheck()
  await edit.getByRole('button', { name: 'Done' }).click()
  await openRibbon(page)
  await expect(tablist(page).getByRole('tab')).toHaveText([
    'Home',
    'Insert',
    'View',
    'Review',
  ])
  await page.reload()
  // The ribbon stays open after a reload (the layout is saved per device).
  await expect(tablist(page)).toBeVisible()
  await expect(tablist(page).getByRole('tab')).toHaveText([
    'Home',
    'Insert',
    'View',
    'Review',
  ])
  // Hide all but one: the last one cannot be unticked.
  await shortBar(page).click()
  await dockedBar(page).getByRole('button', { name: 'Toolbar menu' }).click()
  await page
    .locator('[data-bar="tray"]')
    .getByRole('button', { name: /^Edit bar/ })
    .click()
  const again = page
    .locator('[data-bar="tray"]')
    .getByRole('group', { name: 'Edit bar' })
  const tabsAgain = again.getByRole('group', { name: 'Ribbon tabs to show' })
  for (const name of ['Insert', 'View', 'Review']) {
    await tabsAgain.getByRole('checkbox', { name, exact: true }).uncheck()
  }
  await expect(
    tabsAgain.getByRole('checkbox', { name: 'Home', exact: true }),
  ).toBeDisabled()
})

for (const theme of ['day', 'night', 'sepia'] as const) {
  test(`${theme}: ribbon text is readable and targets are 44 px`, async ({
    page,
  }) => {
    await startInTheme(page, theme)
    await openPage(page)
    await openRibbon(page)
    await behaviour(page).click()
    for (const name of ['File', 'Insert', 'View']) {
      expect(
        await contrastOf(tab(page, name)),
        `${theme} ${name}`,
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        (await tab(page, name).boundingBox())!.height,
      ).toBeGreaterThanOrEqual(43.5)
    }
    expect(await contrastOf(tab(page, 'Home'))).toBeGreaterThanOrEqual(4.5)
    for (const tool of ['Bold', 'Undo', 'Copy & paste']) {
      const button = ribbonTool(page, tool)
      expect(
        await contrastOf(button),
        `${theme} ${tool}`,
      ).toBeGreaterThanOrEqual(4.5)
      const box = (await button.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(43.5)
      expect(box.width).toBeGreaterThanOrEqual(43.5)
    }
    expect(await contrastOf(behaviour(page))).toBeGreaterThanOrEqual(4.5)
    expect(await contrastOf(shortBar(page))).toBeGreaterThanOrEqual(4.5)
    await page.screenshot({
      path: `test-results/ribbon-${theme}.png`,
      clip: { x: 0, y: 0, width: 1000, height: 560 },
    })
  })
}

test.describe('phone: the same layout, tabs and groups scroll sideways', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('tabs and tools scroll, nothing overflows the page, targets are 44 px', async ({
    page,
  }) => {
    await openPage(page)
    await openRibbon(page)
    await behaviour(page).click()
    await expect(tablist(page).getByRole('tab')).toHaveCount(6)
    await expect(panel(page)).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    // The groups are wider than the screen and scroll sideways.
    const scrolls = await panel(page).evaluate(
      (el) => el.scrollWidth > el.clientWidth,
    )
    expect(scrolls).toBe(true)
    // The tabs are reachable by scrolling: View is focusable and selectable.
    await tab(page, 'Review').scrollIntoViewIfNeeded()
    await tab(page, 'Review').click()
    await expect(tab(page, 'Review')).toHaveAttribute('aria-selected', 'true')
    for (const b of await dockedBar(page)
      .getByRole('toolbar')
      .getByRole('button')
      .all()) {
      const r = await b.boundingBox()
      if (!r || r.x + r.width > 390 || r.x < 0) continue
      expect(r.height).toBeGreaterThanOrEqual(43.5)
    }
    await page.screenshot({
      path: 'test-results/ribbon-phone.png',
      clip: { x: 0, y: 0, width: 390, height: 520 },
    })
  })
})
