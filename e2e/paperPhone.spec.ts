// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Polish 2 (phones): on a phone-sized window the boxes are stacked and a tap
 * makes a new box at the end of the reading order, or right after the box
 * above the tap.
 */

test('on a phone a tap adds a box at the end, or after the box above the tap', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Phone boxes')
  await typeInEditor(page, 'Main text')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('[data-paper-sheet]')).toHaveCount(0)
  const extra = page.locator('[data-paper-box]:not([data-paper-box="main"])')

  // The end strip: the first box, then another at the end.
  await page.getByRole('button', { name: 'Add a box here' }).click()
  await expect(extra).toHaveCount(1)
  await expect(extra.first().locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Box A')
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Add a box here' }).click()
  await expect(extra).toHaveCount(2)
  await expect(extra.nth(1).locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Box B')
  await page.waitForTimeout(500)

  // A Text-tool tap in the gap under box A: a box between A and B.
  const a = (await extra.first().boundingBox())!
  await page.mouse.click(a.x + a.width / 2, a.y + a.height + 4)
  await expect(extra).toHaveCount(3)
  await page.keyboard.type('Box C')
  await page.waitForTimeout(500)
  const texts = async () =>
    extra
      .locator('.bn-editor')
      .evaluateAll((els) => els.map((e) => e.textContent?.trim()))
  expect(await texts()).toEqual(['Box A', 'Box C', 'Box B'])

  // The order is saved: it holds after a reload.
  await page.reload()
  await expect(extra).toHaveCount(3)
  await expect(extra.nth(1)).toContainText('Box C')
  expect(await texts()).toEqual(['Box A', 'Box C', 'Box B'])
})
