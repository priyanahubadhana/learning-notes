// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Bug batch item 46 (10 Nov): a tapped box shows two pill handles on its
 * sides; dragging one moves the grid divider next to it.
 */
test.use({ viewport: { width: 1336, height: 1100 } })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'

test('a picked box in a two-column row has a pill that resizes it', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Pills')
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const extra = page.locator(EXTRA)
  for (let i = 0; i < 2; i++) {
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 50 + i * 110,
    )
    await expect(extra).toHaveCount(i + 1)
    await expect(extra.nth(i).locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('Box ' + (i + 1))
  }
  await page.waitForTimeout(600)
  // Box 2 beside box 1 (drop on its right half).
  const a = extra.nth(0)
  const b = extra.nth(1)
  await pickBox(page, b)
  const grip = (await b.locator('[data-box-grip]').boundingBox())!
  const ta = (await a.boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(ta.x + ta.width * 0.9, ta.y + ta.height * 0.5, {
    steps: 8,
  })
  await page.mouse.up()
  await page.waitForTimeout(500)
  // Select the left box with a tap on its frame: 8 round handles show.
  await pickBox(page, a)
  await expect(a.locator('[data-resize-handle]')).toHaveCount(8)
  const pill = a.locator('[data-resize-handle="e"]')
  await expect(pill).toBeVisible()
  const p = (await pill.boundingBox())!
  expect(p.width).toBeGreaterThanOrEqual(44)
  const before = (await a.boundingBox())!.width
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2)
  await page.mouse.down()
  await page.mouse.move(p.x + p.width / 2 + 90, p.y + p.height / 2, {
    steps: 6,
  })
  await page.mouse.up()
  await page.waitForTimeout(400)
  expect((await a.boundingBox())!.width).toBeGreaterThan(before + 40)
})
