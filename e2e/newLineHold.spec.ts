import { expect, test, type Page } from '@playwright/test'
import { center, mainBar, openNote, tool } from './mainBarHelpers.ts'

/**
 * ↵ New line: a tap adds a line (and stays reusable); pressing and holding
 * (about 0.6 s) opens the extras (heading, checklist, divider). Settings: the
 * hold time, "double-tap for extras" instead, or extras off.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const blocks = (page: Page) => page.locator('.bn-editor .bn-block')
const extras = (page: Page) =>
  page.getByRole('menu', { name: 'New line extras' })

async function hold(page: Page, ms: number) {
  const at = await center(tool(page, 'New line'))
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.waitForTimeout(ms)
}

test('a tap adds a line every time, with no menu', async ({ page }) => {
  await openNote(page)
  const start = await blocks(page).count()
  for (let i = 1; i <= 3; i++) {
    await tool(page, 'New line').click()
    await expect(blocks(page)).toHaveCount(start + i)
  }
  await expect(extras(page)).toHaveCount(0)
})

test('hold about 0.6 s: the extras open, and letting go adds no line', async ({
  page,
}) => {
  await openNote(page)
  const start = await blocks(page).count()
  await hold(page, 800)
  await expect(extras(page)).toBeVisible()
  await expect(extras(page).getByRole('menuitem')).toHaveText([
    'Heading',
    'Checklist',
    'Divider',
  ])
  await page.mouse.up()
  await expect(blocks(page)).toHaveCount(start) // the release was not a tap
  await extras(page).getByRole('menuitem', { name: 'Heading' }).click()
  await expect(page.locator('.bn-editor h2')).toHaveCount(1)
  await expect(extras(page)).toHaveCount(0)
})

test('Checklist and Divider extras', async ({ page }) => {
  await openNote(page)
  await hold(page, 800)
  await page.mouse.up()
  await extras(page).getByRole('menuitem', { name: 'Checklist' }).click()
  await expect(page.locator('.bn-editor input[type="checkbox"]')).toHaveCount(1)
  await hold(page, 800)
  await page.mouse.up()
  await extras(page).getByRole('menuitem', { name: 'Divider' }).click()
  await expect(
    page.locator('.bn-editor [data-content-type="divider"]'),
  ).toHaveCount(1)
})

test('a press shorter than the hold time is only a tap', async ({ page }) => {
  await openNote(page)
  const start = await blocks(page).count()
  await hold(page, 250)
  await page.mouse.up()
  await expect(blocks(page)).toHaveCount(start + 1)
  await expect(extras(page)).toHaveCount(0)
})

test('the hold time can be changed in Settings', async ({ page }) => {
  await openNote(page, 'touch', { 'toolbar.newLineHoldMs': 1000 })
  await hold(page, 750)
  await expect(extras(page)).toHaveCount(0)
  await page.waitForTimeout(450)
  await expect(extras(page)).toBeVisible()
  await page.mouse.up()
})

test('"Double-tap" opens the extras by two quick taps, not by holding', async ({
  page,
}) => {
  await openNote(page, 'touch', { 'toolbar.newLineExtras': 'doubleTap' })
  await hold(page, 800)
  await expect(extras(page)).toHaveCount(0)
  await page.mouse.up()
  const start = await blocks(page).count()
  await page.waitForTimeout(500)
  await tool(page, 'New line').click()
  await tool(page, 'New line').click()
  await expect(extras(page)).toBeVisible()
  await expect(blocks(page)).toHaveCount(start + 1) // the second tap opened the extras
})

test('"Off": the extras never open', async ({ page }) => {
  await openNote(page, 'touch', { 'toolbar.newLineExtras': 'off' })
  await hold(page, 900)
  await page.mouse.up()
  await expect(extras(page)).toHaveCount(0)
  await expect(mainBar(page)).toBeVisible()
})

test('the control panel finds New line extras, the hold time and Pencil settings', async ({
  page,
}) => {
  await openNote(page)
  await page.keyboard.press('Control+Shift+K')
  const input = page
    .getByRole('combobox')
    .or(page.getByRole('searchbox'))
    .first()
  for (const [query, row] of [
    ['new line extras', 'New line extras'],
    ['new line hold', 'New line hold time'],
    ['pencil picks', 'Pencil picks the Pen tool'],
    ['hold time', 'Pencil hold time'],
    ['tap twice', 'Pencil: tap twice to start typing'],
  ]) {
    await input.fill(query)
    await expect(page.getByRole('dialog').getByText(row).first()).toBeVisible()
  }
})
