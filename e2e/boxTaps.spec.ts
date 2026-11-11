// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Bug batch items 11 and 20 (10 Nov): ONE tap counter for finger, Pencil and
 * mouse. A box that is not active (Lasso, not picked): 1 selects the BOX
 * (no caret, no keyboard), 2 caret, 3 word, 4 line, 5 paragraph. An active
 * box (picked, or the Text tool): 1 caret, 2 word, 3 line, 4 paragraph.
 */
test.use({ viewport: { width: 1336, height: 1100 }, hasTouch: true })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const TEXT =
  'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega and more words to make the paragraph wrap onto a second visual row inside this narrow box'

async function setup(page: Page) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Taps', 'Box taps')
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.mouse.click(sheet.x + sheet.width * 0.1, main.y + main.height + 60)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type(TEXT)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
}

const wordPoint = (page: Page) =>
  page.evaluate(() => {
    const ed = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
    )!
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    let n = w.nextNode()!
    while (!(n.textContent ?? '').includes('gamma')) n = w.nextNode()!
    const at = (n.textContent ?? '').indexOf('gamma')
    const r = document.createRange()
    r.setStart(n, at)
    r.setEnd(n, at + 5)
    const b = r.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })

const state = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"])',
    )!
    const s = window.getSelection()!
    const inBox = !!s.anchorNode && box.contains(s.anchorNode)
    return {
      picked: box.hasAttribute('data-picked'),
      focused: box.contains(document.activeElement),
      caret: inBox && s.isCollapsed,
      text: inBox ? s.toString() : '',
    }
  })

type How = 'mouse' | 'touch'
async function taps(page: Page, how: How, n: number) {
  const p = await wordPoint(page)
  if (how === 'mouse') {
    // One call runs all the down/up pairs back to back (WebKit on the CI
    // machine is too slow between separate calls for them to count as one run).
    await page.mouse.move(p.x, p.y)
    await page.mouse.click(p.x, p.y, { clickCount: n })
  } else {
    for (let i = 0; i < n; i++) await page.touchscreen.tap(p.x, p.y)
  }
  await page.waitForTimeout(150)
}

for (const how of ['mouse', 'touch'] as const) {
  test(`${how}: Lasso, box not active: 1 box, 2 caret, 3 word, 4 line, 5 paragraph`, async ({
    page,
  }) => {
    await setup(page)
    await tool(page, 'Lasso').click()
    await taps(page, how, 1)
    let s = await state(page)
    expect(s.picked).toBe(true)
    expect(s.focused).toBe(false)
    await expect(page.locator('[data-box-bar-holder]')).toBeVisible()

    // The next tap run starts later; the box is picked now = active.
    await page.waitForTimeout(600)
    await taps(page, how, 1)
    s = await state(page)
    expect(s.caret).toBe(true)
    expect(s.focused).toBe(true)

    await page.waitForTimeout(600)
    await taps(page, how, 2)
    expect((await state(page)).text).toBe('gamma')
    await page.waitForTimeout(600)
    await taps(page, how, 3)
    const line = (await state(page)).text
    expect(line.length).toBeGreaterThan(20)
    expect(line.length).toBeLessThan(TEXT.length)
    await page.waitForTimeout(600)
    await taps(page, how, 4)
    expect((await state(page)).text).toBe(TEXT)
  })

  test(`${how}: a box that is not active takes five quick taps in one run`, async ({
    page,
  }) => {
    await setup(page)
    await tool(page, 'Lasso').click()
    await taps(page, how, 3)
    // Owner final (11 Nov): tap counts are 1 caret, 2 word, 3 line, 4
    // paragraph, so three quick taps select the line.
    const s = await state(page)
    expect(s.picked).toBe(true)
    expect(s.text.length).toBeGreaterThan(20)
    expect(s.text.length).toBeLessThan(TEXT.length)
    await page.waitForTimeout(600)
  })

  test(`${how}: Text tool: 1 caret, 2 word, 3 line, 4 paragraph`, async ({
    page,
  }) => {
    await setup(page)
    await tool(page, 'Text').click()
    await taps(page, how, 1)
    let s = await state(page)
    expect(s.caret).toBe(true)
    expect(s.picked).toBe(false)
    await page.waitForTimeout(600)
    await taps(page, how, 2)
    expect((await state(page)).text).toBe('gamma')
    await page.waitForTimeout(600)
    await taps(page, how, 3)
    s = await state(page)
    expect(s.text.length).toBeGreaterThan(20)
    expect(s.text.length).toBeLessThan(TEXT.length)
    // Four quick taps are timing-sensitive on a slow machine: try the run again.
    await expect(async () => {
      await page.waitForTimeout(600)
      await taps(page, how, 4)
      expect((await state(page)).text).toBe(TEXT)
    }).toPass({ timeout: 20_000 })
  })
}

test('a tap on the bare paper deselects the box', async ({ page }) => {
  await setup(page)
  await tool(page, 'Lasso').click()
  await taps(page, 'mouse', 1)
  expect((await state(page)).picked).toBe(true)
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const box = (await page.locator(EXTRA).boundingBox())!
  await page.mouse.click(sheet.x + sheet.width - 25, box.y + box.height + 150)
  await expect.poll(async () => (await state(page)).picked).toBe(false)
})
