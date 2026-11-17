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
  await page.mouse.click(r.x + r.width - 80, r.y + 8)
  await page.waitForTimeout(500)
  await expect(page.locator('[data-main-frame]')).toBeVisible()
})

test('owner 18 Nov: typed letters do nothing while the first box is selected; Escape deselects', async ({
  page,
}) => {
  await start(page, 'KeysMain', false, PRESET_2B)
  const main = page.locator(MAIN)
  const r = await rect(main)
  await page.mouse.click(r.x + r.width - 80, r.y + 8)
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

/* ---- Review round (owner 18 Nov) ---- */

test('review: the empty page hint sits inside the first box, on its line', async ({
  page,
}) => {
  await start(page, 'HintIn', false, PRESET_2B)
  await page.waitForTimeout(700)
  const b = await rect(page.locator(MAIN))
  const h = await rect(page.locator('[data-paper-hint]'))
  expect(h.y).toBeGreaterThanOrEqual(b.y - 1)
  expect(h.y + h.height).toBeLessThanOrEqual(b.y + b.height + 1)
  expect(h.x).toBeGreaterThanOrEqual(b.x - 1)
  expect(h.x).toBeLessThan(b.x + 20)
  // Still no frame on an empty page.
  await expect(page.locator('[data-main-frame]')).toHaveCount(0)
})

test('owner 18 Nov, hint tap: a tap on or near the hint gives the caret; a tap clearly away selects the box', async ({
  page,
}) => {
  await start(page, 'HintTap', false, PRESET_2B)
  await page.waitForTimeout(700)
  const main = page.locator(MAIN)
  const b = await rect(main)
  const h = await rect(page.locator('[data-paper-hint]'))
  const typing = () => main.evaluate((m) => m.contains(document.activeElement))
  await page.mouse.click(h.x + h.width / 2, h.y + h.height / 2)
  await page.waitForTimeout(400)
  expect(await typing()).toBe(true)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  // Just past the hint's end (about 1.5 letters): still near.
  await page.mouse.click(h.x + h.width + 12, h.y + h.height / 2)
  await page.waitForTimeout(400)
  expect(await typing()).toBe(true)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  // Clearly away: selects, no caret.
  await page.mouse.click(b.x + b.width - 30, h.y + h.height / 2)
  await expect(chrome(page).locator('[data-box-grip]')).toBeVisible()
  expect(await typing()).toBe(false)
})

test('review: the page tabs keep their ⋯ beside them, not wrapped under', async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1194 })
  await start(page, 'TabsRow', false, PRESET_2B)
  await page.waitForTimeout(700)
  const tabs = await rect(page.locator('[data-page-tabs]'))
  const more = await rect(page.locator('[data-page-tabs-menu]'))
  expect(more.y).toBeLessThan(tabs.y + tabs.height)
  expect(more.x).toBeGreaterThan(tabs.x + tabs.width - 2)
})

test('review: a selected first box hides the block handle (⠿ and +)', async ({
  page,
}) => {
  await start(page, 'Handle', false, PRESET_2B)
  const main = page.locator(MAIN)
  await page.locator(MAIN + ' .bn-editor').click({ position: { x: 6, y: 8 } })
  await page.keyboard.type('Hello world')
  await page.waitForTimeout(500)
  await page.mouse.move(300, 300)
  await page.locator(MAIN + ' .bn-inline-content').hover()
  await page.waitForTimeout(400)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  const r = await rect(main)
  await page.mouse.click(r.x + r.width - 80, r.y + 8)
  await expect(chrome(page).locator('[data-box-grip]')).toBeVisible()
  await page.locator(MAIN + ' .bn-inline-content').hover()
  await page.waitForTimeout(400)
  const visible = await page.evaluate(
    () =>
      [...document.querySelectorAll('.bn-side-menu')].filter(
        (e) => getComputedStyle(e).display !== 'none',
      ).length,
  )
  expect(visible).toBe(0)
})

/** Add an empty box under the first one (Text tool) and return it. */
async function emptyBox(page: Page) {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator(MAIN))
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 60)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  return box
}

test('owner 18 Nov: an empty box is gone on the very next frame when the caret leaves it', async ({
  page,
}) => {
  await start(page, 'VanishTap', true)
  await emptyBox(page)
  const gone = await page.evaluate(async () => {
    const box = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"])',
    ) as HTMLElement
    ;(document.activeElement as HTMLElement).blur()
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    return !box.isConnected || getComputedStyle(box).display === 'none'
  })
  expect(gone).toBe(true)
  await expect(page.locator(EXTRA)).toHaveCount(0)
})

test('owner 18 Nov: an empty box is gone on the very next frame when another tool is picked', async ({
  page,
}) => {
  await start(page, 'VanishTool', true)
  await emptyBox(page)
  const gone = await page.evaluate(async () => {
    const box = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"])',
    ) as HTMLElement
    ;(
      document.querySelector('[data-bar-tool="pen"]') as HTMLElement | null
    )?.click()
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    return !box.isConnected || getComputedStyle(box).display === 'none'
  })
  expect(gone).toBe(true)
})

test('owner 18 Nov: a box with a word in it stays when the caret leaves it', async ({
  page,
}) => {
  await start(page, 'VanishKeep', true)
  const box = await emptyBox(page)
  await page.keyboard.type('Stay')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(1500)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(box).toContainText('Stay')
})

for (const name of ['pen', 'highlighter', 'eraser', 'lasso'])
  test(`owner 18 Nov: with the ${name} tool a tap below the last box makes no box`, async ({
    page,
  }) => {
    await start(page, 'Only text ' + name, true)
    const tool = page.locator(`[data-bar-tool="${name}"]`).first()
    await tool.click()
    await page.waitForTimeout(400)
    const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
    const main = await rect(page.locator(MAIN))
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 80,
    )
    await page.waitForTimeout(700)
    await expect(page.locator(EXTRA)).toHaveCount(0)
  })
