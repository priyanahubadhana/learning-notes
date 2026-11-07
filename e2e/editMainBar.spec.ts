import { expect, test, type Page } from '@playwright/test'
import {
  barMenu,
  mainBar,
  openNote,
  openPill,
  option,
  pill,
  pref,
  tool,
} from './mainBarHelpers.ts'

/**
 * Edit bar (redesign step 2): show, hide and reorder the tools of the main
 * bar and each pill's options, Reset, saved per device; a custom bar from
 * before moves over sensibly.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const panel = (page: Page) => page.getByRole('group', { name: 'Edit bar' })
const mainNames = (page: Page) =>
  mainBar(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))

async function openEdit(page: Page) {
  const item = page.getByRole('button', { name: 'Bar settings…' })
  // Open the menu again only while it is still closed (a late re-render of
  // the bar can swallow the first tap).
  await expect(async () => {
    if (!(await item.isVisible())) await barMenu(page).click()
    await expect(item).toBeVisible({ timeout: 2000 })
  }).toPass()
  await item.click()
  await expect(panel(page)).toBeVisible()
}

test('Edit bar is the first item of the ⋯ menu and lists the 9 tools', async ({
  page,
}) => {
  await openNote(page)
  await openEdit(page)
  const rows = panel(page).locator('[data-edit-list="main"] label')
  await expect(rows).toHaveText([
    'Text',
    'Pen',
    'Highlighter',
    'Eraser',
    'New line',
    'Backspace',
    'Lasso',
    'Insert',
    'Read',
  ])
})

test('hide, show and reorder tools of the main bar; saved after a reload', async ({
  page,
}) => {
  await openNote(page)
  await openEdit(page)
  const list = panel(page).locator('[data-edit-list="main"]')
  await list.getByRole('checkbox', { name: 'Highlighter' }).uncheck()
  await expect(tool(page, 'Highlighter')).toHaveCount(0)
  await list.getByRole('button', { name: 'Move Lasso earlier' }).click()
  await list.getByRole('button', { name: 'Move Lasso earlier' }).click()
  const names = await mainNames(page)
  expect(names.indexOf('Lasso')).toBeLessThan(names.indexOf('New line'))
  expect(await pref<string[]>(page, 'toolbar.main')).toEqual([
    'text',
    'pen',
    'eraser',
    'lasso',
    'newLine',
    'backspace',
    'insert',
    'read',
  ])
  await page.reload()
  await expect(mainBar(page)).toBeVisible()
  await expect(tool(page, 'Highlighter')).toHaveCount(0)
  expect(await mainNames(page)).toEqual(names)
  // A hidden tool comes back in its normal place.
  await openEdit(page)
  await panel(page)
    .locator('[data-edit-list="main"]')
    .getByRole('checkbox', { name: 'Highlighter' })
    .check()
  expect((await mainNames(page)).indexOf('Highlighter')).toBe(
    (await mainNames(page)).indexOf('Pen') + 1,
  )
})

test('at least one tool always stays on the bar', async ({ page }) => {
  await openNote(page)
  await openEdit(page)
  const list = panel(page).locator('[data-edit-list="main"]')
  for (const name of [
    'Pen',
    'Highlighter',
    'Eraser',
    'New line',
    'Backspace',
    'Lasso',
    'Insert',
    'Read',
  ]) {
    await list.getByRole('checkbox', { name }).uncheck()
  }
  await expect(list.getByRole('checkbox', { name: 'Text' })).toBeDisabled()
  await expect(tool(page, 'Text')).toBeVisible()
  await expect(barMenu(page)).toBeVisible() // ⋯ is always there
})

test('each pill has its own options to show, hide and reorder', async ({
  page,
}) => {
  await openNote(page)
  await openEdit(page)
  await panel(page).getByLabel('Options of').selectOption('text')
  const list = panel(page).locator('[data-edit-list="pill-text"]')
  await list.getByRole('checkbox', { name: 'Italic' }).uncheck()
  await list.getByRole('button', { name: 'Move Underline earlier' }).click()
  await panel(page).getByRole('button', { name: 'Done' }).click()
  await openPill(page, 'Text', 'text')
  await expect(option(page, 'Italic')).toHaveCount(0)
  const names = await pill(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(names.indexOf('Underline')).toBeLessThan(names.indexOf('Bold'))
  // Pen options too.
  await openEdit(page)
  await panel(page).getByLabel('Options of').selectOption('pen')
  await panel(page)
    .locator('[data-edit-list="pill-pen"]')
    .getByRole('checkbox', { name: 'Colour' })
    .uncheck()
  await panel(page).getByRole('button', { name: 'Done' }).click()
  await openPill(page, 'Pen', 'pen')
  await expect(option(page, 'Red')).toHaveCount(0)
  await expect(option(page, 'Medium')).toBeVisible()
})

test('Reset puts the standard bar and pills back', async ({ page }) => {
  await openNote(page)
  await openEdit(page)
  await panel(page)
    .locator('[data-edit-list="main"]')
    .getByRole('checkbox', { name: 'Eraser' })
    .uncheck()
  await panel(page).getByLabel('Options of').selectOption('eraser')
  await panel(page)
    .locator('[data-edit-list="pill-eraser"]')
    .getByRole('checkbox', { name: 'Size' })
    .uncheck()
  await panel(page).getByRole('button', { name: 'Reset' }).click()
  await expect(tool(page, 'Eraser')).toBeVisible()
  expect(await pref(page, 'toolbar.pills')).toEqual({})
  await openPill(page, 'Eraser', 'eraser')
  await expect(option(page, 'Thin')).toBeVisible()
})

test('the choice is per device: it is only in this browser, never with the notes', async ({
  page,
}) => {
  await openNote(page)
  await openEdit(page)
  await panel(page)
    .locator('[data-edit-list="main"]')
    .getByRole('checkbox', { name: 'Read' })
    .uncheck()
  const keys = await page.evaluate(() =>
    Object.keys(localStorage).filter(
      (k) => k === 'learning-notes:toolbar.main',
    ),
  )
  expect(keys).toEqual(['learning-notes:toolbar.main'])
})

test('a custom bar from before moves over: Text pill buttons, ink tools, extras', async ({
  page,
}) => {
  await openNote(page, 'touch', {
    'formatBar.pinned': ['undo', 'redo', 'italic', 'bold', 'strike', 'newLine'],
    'formatBar.pinned.draw': ['undo', 'redo', 'pen', 'eraser'],
  })
  const names = await mainNames(page)
  expect(names).toContain('Pen')
  expect(names).toContain('Eraser')
  expect(names).not.toContain('Highlighter')
  expect(names).not.toContain('Lasso')
  // The Write buttons they had are in the Text pill, in their order.
  await openPill(page, 'Text', 'text')
  const pillNames = await pill(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(pillNames.filter((n) => /^(Italic|Bold|Underline)$/.test(n!))).toEqual(
    ['Italic', 'Bold'],
  )
  // A button with no pill place stays on the bar.
  await expect(
    mainBar(page).getByRole('button', { name: 'Strikethrough' }),
  ).toBeVisible()
})
