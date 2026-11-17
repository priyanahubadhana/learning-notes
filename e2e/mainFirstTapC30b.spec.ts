// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { rect, start } from './cBoxesHelpers.ts'
import { installRealPen, realPen } from './realPen.ts'

/**
 * C30b (owner 17 Nov: "Yes, same as every box"; docs/design/owner-decisions.md
 * "First tap in a box"), switch textbox.v2, Text tool: the page's first box
 * follows the first-tap rule too. A first tap on or near its words gives the
 * caret at once; a tap in its empty part selects it (frame, dots, tab, menu),
 * with no caret. An empty page keeps the caret at once. Pencil and finger.
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

test.beforeEach(async ({ page }) => {
  await installRealPen(page)
})

const lineEnd = (box: Locator) =>
  box
    .locator('.bn-inline-content')
    .first()
    .evaluate((el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let last: Text | null = null
      for (let n = w.nextNode(); n; n = w.nextNode()) last = n as Text
      const r = document.createRange()
      r.setStart(last!, last!.length - 1)
      r.setEnd(last!, last!.length)
      const b = r.getBoundingClientRect()
      return {
        right: b.right,
        mid: (b.top + b.bottom) / 2,
        fs: parseFloat(getComputedStyle(el).fontSize),
      }
    })
const typingIn = (box: Locator) =>
  box.evaluate((b) => b.contains(document.activeElement))
const chrome = (page: Page) => page.locator('[data-main-chrome]')

async function tapAt(page: Page, x: number, y: number, how: 'pen' | 'finger') {
  if (how === 'pen') await realPen(page, [{ x, y }])
  else await page.touchscreen.tap(x, y)
  await page.waitForTimeout(500)
}

/** A page with the words "Hello world" in its first box, no caret in it. */
async function mainWithWords(page: Page, name: string) {
  await start(page, name, false, PRESET_2B)
  await page.locator(MAIN + ' .bn-editor').click()
  await page.keyboard.type('Hello world')
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
  await expect(chrome(page)).toHaveCount(0)
  return page.locator(MAIN)
}

for (const how of ['pen', 'finger'] as const) {
  test(`C30b (${how}): a tap 1.5 letters past the words of the first box gives the caret at once`, async ({
    page,
  }) => {
    const main = await mainWithWords(page, `MainNear ${how}`)
    const e = await lineEnd(main)
    await tapAt(page, e.right + 1.5 * 0.6 * e.fs, e.mid, how)
    expect(await typingIn(main)).toBe(true)
  })

  test(`C30b (${how}): a tap in the empty part of the first box selects it, no caret; a tap on its words gives the caret`, async ({
    page,
  }) => {
    const main = await mainWithWords(page, `MainFar ${how}`)
    const e = await lineEnd(main)
    const r = await rect(main)
    await tapAt(page, e.right + 8 * 0.6 * e.fs, e.mid, how)
    await expect(chrome(page)).toHaveCount(1)
    await expect(chrome(page).locator('[data-box-grip]')).toBeVisible()
    await expect(page.locator('[data-main-frame]')).toBeVisible()
    expect(await typingIn(main)).toBe(false)
    // The box did not move or change size.
    const r2 = await rect(main)
    expect(Math.abs(r2.height - r.height)).toBeLessThan(2)
    expect(Math.abs(r2.y - r.y)).toBeLessThan(2)
    expect(Math.abs(r2.x - r.x)).toBeLessThan(2)
    // Selected already: the empty part keeps it selected.
    await tapAt(page, e.right + 9 * 0.6 * e.fs, e.mid, how)
    await expect(chrome(page)).toHaveCount(1)
    expect(await typingIn(main)).toBe(false)
    // Its words take the caret; the selection becomes the typing look.
    await page.waitForTimeout(700)
    const e2 = await lineEnd(main)
    await tapAt(page, r.x + 50, e2.mid, how)
    expect(await typingIn(main)).toBe(true)
    // Typing still works.
    await page.keyboard.type('!')
    await expect(main).toContainText('!')
  })

  test(`C30b (${how}): a tap elsewhere on the paper or Escape ends the selection of the first box`, async ({
    page,
  }) => {
    const main = await mainWithWords(page, `MainOff ${how}`)
    const e = await lineEnd(main)
    await tapAt(page, e.right + 8 * 0.6 * e.fs, e.mid, how)
    await expect(chrome(page)).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(chrome(page)).toHaveCount(0)
    await tapAt(page, e.right + 8 * 0.6 * e.fs, e.mid, how)
    await expect(chrome(page)).toHaveCount(1)
    const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
    await tapAt(page, sheet.x + 8, sheet.y + sheet.height - 8, how)
    await expect(chrome(page)).toHaveCount(0)
  })

  test(`C30b (${how}): an empty page keeps the caret at once on the first tap`, async ({
    page,
  }) => {
    await start(page, `MainEmpty ${how}`, false, PRESET_2B)
    const main = page.locator(MAIN)
    const r = await rect(main)
    await tapAt(page, r.x + r.width / 2, r.y + 12, how)
    expect(await typingIn(main)).toBe(true)
  })
}
