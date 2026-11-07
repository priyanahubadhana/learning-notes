// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  painted,
  stroke,
  textBox,
  type Pt,
} from './inkHelpers.ts'
import { option, tool } from './mainBarHelpers.ts'

/**
 * Round 6 bar fixes (7 Nov): R6-1 grip drags are drag-only, R6-3 the
 * rectangle Lasso, R6-4 the iOS callout, R6-6 Deselect, R6-8 choosing a tool
 * never moves the page, R6-10 "Toolbar: finger only". Simulated pointer events;
 * runs in Chromium and in the iPad stand-in (ipad-webkit).
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

/** Ink over the first line of words, then the Lasso. */
async function inkThenLasso(page: Page) {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(600)
  const box = await textBox(page)
  const y = box.y + box.height / 2
  await stroke(page, line([box.x + 10, y], [box.x + 180, y]))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  return { box, y }
}

test('R6-3: the rectangle Lasso draws a live rectangle and selects by it', async ({
  page,
}) => {
  const { box, y } = await inkThenLasso(page)
  await option(page, 'Rectangle').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const now = await textBox(page)
  const dy = now.y - box.y
  const from: Pt = [box.x + 2, y + dy + 30]
  const to: Pt = [box.x + 200, y + dy - 30]
  // A diagonal drag: a freeform loop would paint a thin line, a rectangle
  // paints its four sides.
  await stroke(page, line(from, to, 12), { keepDown: true, id: 51 })
  const px = await painted(page, 'live')
  expect(px).toBeGreaterThan(5000) // the tinted box, not a thin line
  await stroke(page, [to], { id: 51 })
  await expect(page.locator('[data-ink-box]')).toBeVisible()
})
