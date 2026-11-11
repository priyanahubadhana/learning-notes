// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { openPill, pill } from './mainBarHelpers.ts'

/**
 * Owner bug batch 3 (11 Nov 2026), Priority 1: the text box like GoodNotes.
 * One box holds many lines (Enter adds a line inside); the grip and the menu
 * are big and only on the selected box; no stray box during or right after a
 * drag; a tap anywhere on a box edits it; the first box has them too; 8 round
 * handles; a safe gap under the tab bar; Layout mode on the page itself.
 */
test.use({ viewport: { width: 1336, height: 1100 }, hasTouch: true })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!
const blur = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement).blur())

async function start(page: Page, name: string) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

async function newBox(page: Page, n: number, text = 'Box') {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  await page.mouse.click(
    sheet.x + sheet.width * 0.3,
    main.y + main.height + 50 + (n - 1) * 110,
  )
  const extra = page.locator(EXTRA)
  await expect(extra).toHaveCount(n)
  await expect(extra.nth(n - 1).locator('.bn-editor')).toBeFocused()
  if (text) await page.keyboard.type(text + ' ' + n)
  await page.waitForTimeout(600)
  return extra.nth(n - 1)
}

test('Enter adds a line inside the same box (one block, one box)', async ({
  page,
}) => {
  await start(page, 'Lines')
  const box = await newBox(page, 1, 'First')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Fourth')
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(box.locator('.bn-block-outer')).toHaveCount(1)
  await expect(box).toContainText('First 1')
  await expect(box).toContainText('Fourth')
  expect((await rect(box)).height).toBeGreaterThan(60)
  // Nothing is lost on reload.
  await page.waitForTimeout(900)
  await page.reload()
  await expect(page.locator(EXTRA)).toContainText('Second')
  await expect(page.locator(EXTRA)).toContainText('Fourth')
})

test('B3-1/6: grip and menu are 44 pt, only on the selected box; the first box has them too', async ({
  page,
}) => {
  await start(page, 'Chrome')
  const box = await newBox(page, 1)
  await blur(page)
  await expect(box.locator('[data-box-grip]')).toBeHidden()
  await expect(box.locator('[data-box-menu]')).toBeHidden()
  await pickBox(page, box)
  for (const sel of ['[data-box-grip]', '[data-box-menu]']) {
    await expect(box.locator(sel)).toBeVisible()
    const r = await rect(box.locator(sel))
    expect(r.width).toBeGreaterThanOrEqual(44)
    expect(r.height).toBeGreaterThanOrEqual(44)
  }
  // The first box (the page's own text) shows them while the caret is in it.
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  const main = page.locator('[data-main-chrome]')
  await expect(main.locator('[data-box-grip]')).toBeVisible()
  await expect(main.locator('[data-box-menu]')).toBeVisible()
  const mg = await rect(main.locator('[data-box-grip]'))
  expect(mg.width).toBeGreaterThanOrEqual(44)
})

test('B3-2/3/4: no new box after a drag, a tap on a box edits it, empty paper still makes one', async ({
  page,
}) => {
  await start(page, 'Taps')
  const box = await newBox(page, 1)
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const r0 = await rect(box)
  // A tap on the frame's empty right side edits this box: still one box.
  await blur(page)
  await page.mouse.click(r0.x + r0.width - 6, r0.y + r0.height - 6)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  // Drag it (select, then the grip) and tap empty paper at once: no new box.
  await pickBox(page, box)
  const g = await rect(box.locator('[data-box-grip]'))
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2, g.y + 160, { steps: 6 })
  await page.mouse.up()
  const r1 = await rect(box)
  await page.mouse.click(sheet.x + sheet.width * 0.8, r1.y + r1.height + 200)
  await page.waitForTimeout(300)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  // After the short wait: the first tap only deselects the dropped box (2a),
  // the next one makes a box.
  await page.waitForTimeout(900)
  await page.mouse.click(sheet.x + sheet.width * 0.8, r1.y + r1.height + 200)
  await page.waitForTimeout(300)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await page.mouse.click(sheet.x + sheet.width * 0.8, r1.y + r1.height + 200)
  await expect(page.locator(EXTRA)).toHaveCount(2)
})

test('B3-9: 8 round handles; the height never goes below the content', async ({
  page,
}) => {
  await start(page, 'Handles')
  const box = await newBox(page, 1)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line')
  await page.waitForTimeout(500)
  await blur(page)
  await pickBox(page, box)
  const handles = box.locator('[data-resize-handle]')
  await expect(handles).toHaveCount(8)
  for (const h of await handles.all())
    expect((await rect(h)).width).toBeGreaterThanOrEqual(44)
  const h0 = (await rect(box)).height
  const s = await rect(box.locator('[data-resize-handle="s"]'))
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2)
  await page.mouse.down()
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2 + 120, {
    steps: 6,
  })
  await page.mouse.up()
  await expect
    .poll(async () => (await rect(box)).height)
    .toBeGreaterThan(h0 + 80)
  // Pulling it back up stops at the content: text never shrinks or scrolls.
  const s2 = await rect(box.locator('[data-resize-handle="s"]'))
  await page.mouse.move(s2.x + s2.width / 2, s2.y + s2.height / 2)
  await page.mouse.down()
  await page.mouse.move(s2.x + s2.width / 2, s2.y - 400, { steps: 8 })
  await page.mouse.up()
  await expect
    .poll(async () => Math.abs((await rect(box)).height - h0))
    .toBeLessThan(4)
})

test('B3-10: the first row sits clear below the tab bar (safe gap)', async ({
  page,
}) => {
  await start(page, 'Gap')
  const wrap = await rect(page.locator('[data-paper-wrap]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  // The gap reserved above the page text is one touch target (44 px).
  expect(main.y - wrap.y).toBeGreaterThanOrEqual(44)
  const box = await newBox(page, 1)
  await pickBox(page, box)
  const g = await rect(box.locator('[data-box-grip]'))
  expect(g.y).toBeGreaterThanOrEqual(wrap.y)
})

test('B3-5/7/8: Layout opens on the page; a layout applies at once; Undo is one step', async ({
  page,
}) => {
  await start(page, 'Mode')
  await newBox(page, 1)
  await newBox(page, 2)
  // The Text strip has a Layout button (always enabled).
  await openPill(page, 'Text', 'text')
  await pill(page, 'text').getByLabel('Layout').click()
  await expect(page.locator('[data-layout-bar]')).toBeVisible()
  await expect(page.locator('[data-layout-coach]')).toContainText(
    'This is how your page will look',
  )
  await expect(page.locator('[data-paper][data-layout-mode]')).toHaveCount(1)
  const a = page.locator(EXTRA).nth(0)
  const b = page.locator(EXTRA).nth(1)
  const before = await rect(b)
  await page.locator('[data-layout-preset="two"]').click()
  await expect
    .poll(async () => (await rect(b)).x - (await rect(a)).x)
    .toBeGreaterThan(100)
  // Undo puts the page back as it was when the mode opened.
  await page.locator('[data-layout-undo]').click()
  await expect
    .poll(async () => Math.abs((await rect(b)).x - before.x))
    .toBeLessThan(6)
  await page.locator('[data-layout-done]').click()
  await expect(page.locator('[data-layout-bar]')).toHaveCount(0)
  await expect(page.locator('[data-paper][data-layout-mode]')).toHaveCount(0)
})
