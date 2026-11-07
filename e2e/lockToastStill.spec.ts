// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'
import { card, option, pill, tool } from './mainBarHelpers.ts'

/**
 * R6-21: the page shifted about 62 px up after the layer-lock toast. The
 * toast itself (fixed at the bottom) moves nothing; the jump came when the
 * toast's Unlock was tapped: that tap counted as a tap outside the open
 * options pill, the pill closed, and its height left the stack above the
 * page. A toast is feedback for the thing the person is doing, so a tap on
 * it (Undo, Unlock) must leave the pill open and the page where it is.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

/** Where the first line of the page sits on screen, and the page scroller's top. */
const placement = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('.bn-block-content')!
    const s = document.querySelector('[data-page-scroller]')!
    return {
      line: Math.round(el.getBoundingClientRect().y),
      scroller: Math.round(s.getBoundingClientRect().y),
    }
  })

test('R6-21: tapping Unlock in the lock toast keeps the pill open and the page still', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 300, y]))
  await expectStrokes(page, 1)
  if (!(await pill(page).isVisible())) await tool(page, 'Pen').click()
  if (!(await card(page).isVisible())) {
    await option(page, /^Pen type/)
      .first()
      .click()
  }
  await page.locator('[data-card-nav="layers"]').click()
  await page.locator('[data-layer-add]').click()
  await expect(page.locator('[data-layer]')).toHaveCount(2)
  await page
    .locator('[data-layer]')
    .first()
    .getByRole('button', { name: 'Lock Layer 2' })
    .click()
  const before = await placement(page)
  // Drawing on the locked layer is refused with a toast that can unlock it.
  await stroke(page, line([box.x + 300, y + 360], [box.x + 560, y + 360]))
  await expect(page.getByText('Layer 2 is locked')).toBeVisible()
  expect(await placement(page)).toEqual(before)
  await page.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(page.getByText('Layer 2 is locked')).toHaveCount(0)
  // The layer is unlocked, the pill is still open, and nothing moved.
  await expect(
    page
      .locator('[data-layer]')
      .first()
      .getByRole('button', { name: 'Lock Layer 2' }),
  ).toBeVisible()
  await expect(pill(page)).toBeVisible()
  await page.waitForTimeout(500)
  expect(await placement(page)).toEqual(before)
  // Drawing there works again, at the same place on screen.
  await stroke(page, line([box.x + 300, y + 360], [box.x + 560, y + 360]))
  await expectStrokes(page, 2)
})
