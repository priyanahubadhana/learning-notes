// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Owner (8 Nov): the page never moves under a gesture. The first Pen or
 * Lasso touch on the page closes the tool's options pill; the room the pill
 * kept is given back only when the pen lifts, so a stroke or a Lasso loop
 * being drawn stays where it is drawn (app/tools/main/gestureHold.ts).
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const lineY = (page: Page) =>
  page
    .locator('.bn-block-content')
    .first()
    .evaluate((e) => e.getBoundingClientRect().top)

for (const name of ['Pen', 'Lasso'] as const) {
  test(`the page holds still under a ${name} gesture that closes the pill`, async ({
    page,
  }) => {
    await openNote(page, 'computer')
    await tool(page, name).click()
    await page.waitForTimeout(600)
    await expect(page.locator('[data-pill-root]').first()).toBeVisible()
    const before = await lineY(page)
    const r = (await page.locator('.bn-block-content').first().boundingBox())!
    const y = r.y + 200
    // The pointer goes down on the page (the pill closes) and keeps moving:
    // the page must not jump under it.
    // On the paper's margin, beside the text (the paper itself, not the ink
    // pad over the text).
    const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
    await page.mouse.move(sheet.x + 10, y)
    await page.mouse.down()
    await page.mouse.move(sheet.x + 20, y + 40, { steps: 4 })
    await page.waitForTimeout(400)
    expect(Math.abs((await lineY(page)) - before)).toBeLessThan(1)
    await page.mouse.move(sheet.x + 30, y + 80, { steps: 4 })
    expect(Math.abs((await lineY(page)) - before)).toBeLessThan(1)
    await page.mouse.up()
  })
}
