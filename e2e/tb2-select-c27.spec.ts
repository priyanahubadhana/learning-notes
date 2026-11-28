// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import { mkdirSync } from 'node:fs'
import { pick } from './cBoxesHelpers.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * C27 (owner, 17 Nov 2026), replaces TB-10: a new box is as wide as the whole
 * line, one line tall, and grows downward only as text is written. The first
 * box on a page is one line tall when empty. A box sized by hand keeps its
 * size. Switch textbox.v2 ON. Pictures go to screenshots/c27/.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const MAIN = '[data-paper-box="main"]'
const rect = async (l: Locator) => (await l.boundingBox())!
const SIZES = [
  { name: 'ipad-sideways', width: 1180, height: 820 },
  { name: 'ipad-upright', width: 820, height: 1180 },
  { name: 'phone', width: 390, height: 844 },
]

async function start(
  page: Page,
  name: string,
  typeMain: boolean,
  vp: (typeof SIZES)[0],
) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await page.setViewportSize(vp)
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  if (typeMain) await typeInEditor(page, 'Main text')
}

/** Makes a new box under the main text (phone: the end strip). */
async function newBox(page: Page, vp: (typeof SIZES)[0]) {
  if (vp.name === 'phone') {
    await page.getByRole('button', { name: 'Add a box here' }).click()
  } else {
    const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
    const main = await rect(page.locator(MAIN))
    await page.mouse.click(
      sheet.x + sheet.width * 0.4,
      main.y + main.height + 60,
    )
  }
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.waitForTimeout(500)
  return box
}

const shot = (page: Page, vp: (typeof SIZES)[0], what: string) => {
  const dir = 'screenshots/c27/' + test.info().project.name
  mkdirSync(dir, { recursive: true })
  return page.screenshot({ path: `${dir}/${what}-${vp.name}.png` })
}

for (const vp of SIZES) {
  test.describe(vp.name, () => {
    test(`C27: a new box is as wide as the line and one line tall; 3 lines grow it down only (${vp.name})`, async ({
      page,
    }) => {
      await start(page, 'C27 new ' + vp.name, true, vp)
      const box = await newBox(page, vp)
      const main = await rect(page.locator(MAIN))
      const empty = await rect(box)
      await shot(page, vp, 'new-box')
      // As wide as the line (the page text width).
      if (vp.name === 'phone') {
        // Stacked: the box fills the phone's column from the text's left edge
        // (the default box itself is wider than the screen there).
        expect(Math.abs(empty.x - main.x)).toBeLessThan(6)
        expect(empty.width).toBeGreaterThan(vp.width * 0.7)
        expect(empty.x + empty.width).toBeLessThanOrEqual(vp.width)
      } else {
        expect(Math.abs(empty.width - main.width)).toBeLessThan(6)
        expect(Math.abs(empty.x - main.x)).toBeLessThan(6)
      }
      // One line tall (a line of text plus its padding).
      expect(empty.height).toBeLessThan(64)
      await page.keyboard.type('Line one')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Line two')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Line three')
      await page.waitForTimeout(500)
      const grown = await rect(box)
      await shot(page, vp, 'after-typing')
      expect(grown.height).toBeGreaterThan(empty.height + 30)
      expect(Math.abs(grown.width - empty.width)).toBeLessThan(2)
      expect(Math.abs(grown.x - empty.x)).toBeLessThan(2)
      await expect(box).not.toContainText('Type here')
      // C11: while typing the box shows a thin border and no dots.
      const frame = box.locator('[data-box-frame]').first()
      await expect(frame).toHaveCSS('border-top-style', 'solid')
      await expect(frame).not.toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
      const bw = await frame.evaluate((el) =>
        parseFloat(getComputedStyle(el).borderTopWidth),
      )
      expect(bw).toBeLessThanOrEqual(1.01)
      expect(bw).toBeGreaterThan(0)
      await shot(page, vp, 'typing-border')
    })

    test(`C27: the first box on a fresh page is one line tall, then as tall as its text (${vp.name})`, async ({
      page,
    }) => {
      await start(page, 'C27 first ' + vp.name, false, vp)
      const main = page.locator(MAIN)
      await expect(main).toBeVisible()
      await page.waitForTimeout(500)
      const empty = await rect(main)
      await shot(page, vp, 'first-box')
      expect(empty.height).toBeLessThan(64)
      await typeInEditor(page, 'One')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Two')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Three')
      await page.waitForTimeout(500)
      const grown = await rect(main)
      expect(grown.height).toBeGreaterThan(empty.height + 30)
      // No spare writing area: about three lines, not a page.
      expect(grown.height).toBeLessThan(empty.height + 160)
    })
  })
}

test('C27: a box sized by hand keeps its size after a reload', async ({
  page,
}) => {
  const vp = SIZES[0]
  await start(page, 'C27 keep', true, vp)
  const box = await newBox(page, vp)
  await page.keyboard.type('Keep me')
  await page.waitForTimeout(400)
  const before = await rect(box)
  // Narrower and taller by its dots: the bottom-right (se) dot.
  await page.keyboard.press('Escape')
  await pick(page, box)
  const dot = box.locator('[data-resize-handle="se"] [data-handle-dot]')
  const d = await rect(dot)
  const x = d.x + d.width / 2
  const y = d.y + d.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(450)
  await page.mouse.move(x - 150, y + 60, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(800)
  const sized = await rect(box)
  expect(sized.width).toBeLessThan(before.width - 100)
  expect(sized.height).toBeGreaterThan(before.height + 40)
  await page.reload()
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await page.waitForTimeout(800)
  const after = await rect(page.locator(EXTRA))
  expect(Math.abs(after.width - sized.width)).toBeLessThan(3)
  expect(Math.abs(after.height - sized.height)).toBeLessThan(3)
})
