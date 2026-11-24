// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/**
 * Phase 2B, task 2B.5b (switch textbox.v2 ON): on a phone a finger outside
 * the dots still scrolls the page (TB-20, TB-21, TB-22).
 *
 * Moved here, unchanged, from tb2-resize-phone.spec.ts (owner OK, 15 Nov 2026):
 * the test scrolls with a mouse wheel, which the `ipad-webkit` stand-in cannot
 * do. This file name is outside the `ipad-webkit` list in playwright.config.ts,
 * so the test runs on chromium and desktop Safari only.
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 3,
})

import { phoneBox, rect } from './phoneResizeHelpers.ts'

test('phone: a finger on the page outside the dots still scrolls it', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P-scroll', ['Alpha beta'], { tall: true })
  const f = await rect(box)
  const scroller = page.locator('[data-page-scroller]')
  const top0 = await scroller.evaluate((el) => el.scrollTop)
  await page.mouse.move(380, 300)
  await page.mouse.wheel(0, -200)
  await page.waitForTimeout(500)
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeLessThan(top0)
  const g = await rect(box)
  expect(Math.abs(g.width - f.width)).toBeLessThan(1.5)
})
