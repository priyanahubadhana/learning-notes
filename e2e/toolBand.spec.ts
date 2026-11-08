// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, openPill, pill, tool } from './mainBarHelpers.ts'

/**
 * R8-1: the page has a gap under the main bar, just tall enough for the
 * options pill. A pill at the top sits in it; opening or closing it never
 * moves the page. Scrolled down, the pill floats over the page.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const lineY = (page: Page) =>
  page
    .locator('.bn-block-content')
    .first()
    .evaluate((e) => e.getBoundingClientRect().top)

test('opening and closing the pill never moves the page', async ({ page }) => {
  await openNote(page, 'computer')
  const before = await lineY(page)
  await openPill(page, 'Pen', 'pen')
  await page.waitForTimeout(400)
  expect(Math.abs((await lineY(page)) - before)).toBeLessThan(1)
  // The pill sits in the gap above the first line.
  const p = (await pill(page).boundingBox())!
  expect(p.y + p.height).toBeLessThanOrEqual(before + 1)
  await page.locator('[data-pill-close]').click()
  await expect(pill(page)).toHaveCount(0)
  await page.waitForTimeout(400)
  expect(Math.abs((await lineY(page)) - before)).toBeLessThan(1)
  await tool(page, 'Text').click()
  await page.waitForTimeout(400)
  expect(Math.abs((await lineY(page)) - before)).toBeLessThan(1)
})

test('a pill on the left floats over the page without moving it', async ({
  page,
}) => {
  await openNote(page, 'computer')
  const before = await lineY(page)
  await page.evaluate(() =>
    localStorage.setItem(
      'learning-notes:toolbar.pillPlace',
      JSON.stringify({ edge: 'left', along: 0.5 }),
    ),
  )
  await page.reload()
  await openPill(page, 'Pen', 'pen')
  await page.waitForTimeout(400)
  expect(Math.abs((await lineY(page)) - before)).toBeLessThan(1)
})
