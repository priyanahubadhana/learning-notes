// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  rowAction,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Batch 2c: Touch and Pencil share one default (the bar always visible, at
 * the top), sticky section chips sit below the bar, and the ⋯ toolbar menu
 * lists every tool and action.
 */

test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

const tray = (page: Page) => page.locator('[data-bar="tray"]')
const menuButton = (page: Page) =>
  dockedBar(page).getByRole('button', { name: 'Toolbar menu' })

async function openPage(page: Page, mode: 'touch' | 'pencil' = 'touch') {
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

for (const mode of ['touch', 'pencil'] as const) {
  test(`${mode}: the bar is always visible, docked at the top`, async ({
    page,
  }) => {
    await openPage(page, mode)
    // Nothing is selected, and the editor is not even focused.
    await page.getByRole('textbox', { name: 'Page title' }).click()
    await expect(dockedBar(page)).toBeVisible()
    await expect(dockedBar(page)).toHaveAttribute('data-placement', 'top')
    await expect(
      dockedBar(page).getByRole('button', { name: 'Text', exact: true }),
    ).toBeVisible()
    await expect(page.locator('.bn-formatting-toolbar')).toHaveCount(0)
    // The Edit bar is reachable.
    await menuButton(page).click()
    await expect(
      tray(page).getByRole('button', { name: /^Edit bar/ }),
    ).toBeVisible()
  })
}

test('the presets use the top position for Touch and Pencil', async ({
  page,
}) => {
  await page.goto('/#/settings')
  await page.getByRole('button', { name: /^Advanced/ }).click()
  for (const mode of ['Touch', 'Pencil']) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    await expect(
      page
        .locator('[data-setting-id="advanced.barPlacement"]')
        .getByRole('button', { name: 'Top', pressed: true }),
    ).toBeVisible()
  }
})

test('sticky section chips stay visible below the docked bar', async ({
  page,
}) => {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await rowAction(page, 'Biology', 'Add page')
  await page.getByRole('menuitem', { name: 'From template…' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Lesson\s*Detailed/ })
    .click()
  const chips = page.getByRole('navigation', { name: 'Sections' })
  await expect(chips).toBeVisible()
  // Make the page long, then scroll to the end.
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Line ${i}`)
  }
  await page.keyboard.press('Control+End')
  await page.waitForTimeout(500)
  const bar = (await dockedBar(page).boundingBox())!
  const chipBox = (await chips.boundingBox())!
  expect(bar.y).toBeLessThan(100)
  expect(chipBox.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1)
  // The chips are not covered: the topmost thing at their centre is a chip.
  const covered = await page.evaluate(
    ({ x, y }) =>
      !document.elementFromPoint(x, y)?.closest('nav[aria-label="Sections"]'),
    { x: chipBox.x + 20, y: chipBox.y + chipBox.height / 2 },
  )
  expect(covered).toBe(false)
})

test.describe('toolbar menu', () => {
  test('lists every tool, pinned or not, in 44 px rows', async ({ page }) => {
    await openPage(page)
    await menuButton(page).click()
    const menu = page.getByRole('group', { name: 'Toolbar menu' })
    await expect(menu).toBeVisible()
    for (const name of [
      'Bold',
      'Italic',
      'Underline',
      'Strike',
      'Code',
      'Key point',
      'Keyword',
      'Must know',
      'Formula',
      'Make blank',
      'Make card',
      'New line',
      'Align text left',
      'Align text center',
      'Align text right',
      'Colors',
      'Nest block',
      'Unnest block',
      'Create link',
      'Copy as plain text',
      'Copy as Markdown',
      'Paste as plain text',
      'Copy page with pictures',
      'Edit bar',
    ]) {
      await expect(
        menu.getByText(new RegExp('^' + name)).first(),
        name,
      ).toBeVisible()
    }
    for (const b of await menu.getByRole('button').all()) {
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
    }
    // A tool from the menu works on the cursor's text.
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
  })

  test('is hidden until opened, and works with the keyboard', async ({
    page,
  }) => {
    await openPage(page)
    await expect(tray(page)).toHaveCount(0)
    await menuButton(page).focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('group', { name: 'Toolbar menu' })
    await expect(menu).toBeVisible()
    // Focus moves into the menu (past the ✕ in its corner); arrows move between rows.
    const rows = menu.locator('button:not([data-popup-close])')
    await expect(menu.getByRole('button', { name: 'Close' })).toBeVisible()
    await expect(rows.first()).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(rows.nth(1)).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(rows.first()).toBeFocused()
    // Esc closes it and gives the focus back to the button.
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(menuButton(page)).toBeFocused()
  })

  test('a tool in the menu changes the text, Edit bar opens', async ({
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
    await menuButton(page).click()
    await page
      .getByRole('group', { name: 'Toolbar menu' })
      .getByRole('button', { name: /^Strike/ })
      .click()
    await expect(page.locator('.bn-editor s, .bn-editor del')).toContainText(
      'nucleus',
    )
    await tray(page)
      .getByRole('button', { name: /^Edit bar/ })
      .click()
    await expect(
      tray(page).getByRole('group', { name: 'Edit bar' }),
    ).toBeVisible()
  })
})
