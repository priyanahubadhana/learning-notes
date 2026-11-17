// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { addBox, EXTRA, rect, start } from './cBoxesHelpers.ts'
import { pickBox, startInMode } from './helpers.ts'

/**
 * C33 and C34 (owner, iPad, 18 Nov 2026; docs/design/owner-decisions.md "Box
 * size and hints", "First tap in a box", "Empty page, tap below, keys on a
 * selected box"), switch textbox.v2.
 * C33: the page's first box is one line tall when empty and as tall as its
 *   text after that, with any tool on (an ink tool used to stretch it to a
 *   screenful on the iPad).
 * C34: the empty part of the first box selects it, on an empty page too.
 * Owner 18 Nov: an empty page shows no frame, only the hint; typed letters do
 *   nothing while a box is selected (Escape and Delete keep their jobs).
 */
test.use({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const PRESET_2B = [
  'foundation.shell',
  'settings.v3',
  'storage.safety',
  'update.v2',
  'security.m1',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
]
const MAIN = '[data-paper-box="main"]'
const chrome = (page: Page) => page.locator('[data-main-chrome]')

/** Pick the tool of the tool bar through the store the app reads. */
async function lineHeight(page: Page) {
  return page
    .locator(MAIN + ' .bn-inline-content')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).lineHeight))
}

test('C33 (pencil mode, the Lasso on by default): the first box of an empty page is one line tall', async ({
  page,
}) => {
  await startInMode(page, 'pencil')
  await start(page, 'TallPencil', false, PRESET_2B)
  await page.waitForTimeout(900)
  const lh = await lineHeight(page)
  expect((await rect(page.locator(MAIN))).height).toBeLessThan(lh * 1.6)
})

for (const mode of ['computer'] as const) {
  test(`C33 (${mode}): an empty page's first box is one line tall; after 3 lines it is 3 lines tall`, async ({
    page,
  }) => {
    await startInMode(page, mode)
    await start(page, `Tall ${mode}`, false, PRESET_2B)
    await page.waitForTimeout(900)
    const lh = await lineHeight(page)
    const box = page.locator(MAIN)
    const one = await rect(box)
    // One line plus a little padding, never a writing area.
    expect(one.height).toBeLessThan(lh * 1.6)
    // With the caret in it (its frame shows) it is the same.
    await page.locator(MAIN + ' .bn-editor').click({ position: { x: 5, y: 5 } })
    await page.waitForTimeout(500)
    expect((await rect(box)).height).toBeLessThan(lh * 1.6)
    const frame = page.locator('[data-main-frame]')
    await expect(frame).toBeVisible()
    expect((await rect(frame)).height).toBeLessThan(lh * 1.6 + 16)
    // Three lines of one paragraph (a line break each), not three blocks.
    await page.keyboard.type('One')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Two')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Three')
    await page.waitForTimeout(600)
    const three = await rect(box)
    const ed = await rect(box.locator('.bn-editor'))
    expect(three.height).toBeGreaterThan(one.height * 2.4)
    expect(three.height).toBeLessThanOrEqual(one.height * 3 + 4)
    // No gap under the last line: the box ends where the editor ends.
    expect(three.height - ed.height).toBeLessThan(8)
  })
}

test('owner 18 Nov: an empty page shows its hint and no frame until the first box is tapped', async ({
  page,
}) => {
  await start(page, 'NoFrame', false, PRESET_2B)
  await page.waitForTimeout(700)
  await expect(page.locator('[data-paper-hint]')).toBeVisible()
  await expect(page.locator('[data-main-frame]')).toHaveCount(0)
  const r = await rect(page.locator(MAIN))
  await page.mouse.click(r.x + r.width / 2, r.y + 8)
  await page.waitForTimeout(500)
  await expect(page.locator('[data-main-frame]')).toBeVisible()
})

test('owner 18 Nov: typed letters do nothing while the first box is selected; Escape deselects', async ({
  page,
}) => {
  await start(page, 'KeysMain', false, PRESET_2B)
  const main = page.locator(MAIN)
  const r = await rect(main)
  await page.mouse.click(r.x + r.width / 2, r.y + 8)
  await expect(chrome(page).locator('[data-box-grip]')).toBeVisible()
  await page.keyboard.type('hello')
  await page.waitForTimeout(400)
  await expect(main).not.toContainText('hello')
  expect(await main.evaluate((b) => b.contains(document.activeElement))).toBe(
    false,
  )
  await expect(chrome(page).locator('[data-box-grip]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(chrome(page)).toHaveCount(0)
})

test('owner 18 Nov: typed letters do nothing while another box is selected; Delete still deletes it', async ({
  page,
}) => {
  await start(page, 'KeysExtra', true)
  const box = await addBox(page, ['Alpha'], 0.3, 60)
  await pickBox(page, box)
  await page.keyboard.type('zzz')
  await page.waitForTimeout(400)
  await expect(page.locator(MAIN)).not.toContainText('zzz')
  await expect(box).not.toContainText('zzz')
  await expect(box).toContainText('Alpha')
  await expect(box).toHaveAttribute('data-picked', '')
  await page.keyboard.press('Delete')
  await expect(page.locator(EXTRA)).toHaveCount(0)
})
