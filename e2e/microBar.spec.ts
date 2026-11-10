// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Bug batch item 12 (10 Nov): while the caret is in a box, one small floating
 * row (colour dot, size, Aa, B, I, align, list, highlighter, more) shows next
 * to the box; it can be dragged and the place is remembered.
 */
test.use({ viewport: { width: 1180, height: 900 } })

test('the micro bar shows with the caret, formats, and keeps a dragged place', async ({
  page,
}) => {
  await openNote(page, 'computer')
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  const bar = page.locator('[data-micro-bar]')
  await page.keyboard.type(' more')
  await expect(bar).toBeVisible()
  expect((await bar.boundingBox())!.height).toBeLessThan(60)
  for (const id of [
    'colour',
    'size',
    'style',
    'bold',
    'italic',
    'align',
    'list',
    'highlight',
    'more',
  ])
    await expect(bar.locator(`[data-micro="${id}"]`)).toBeVisible()
  // Bold from the micro bar keeps the caret in the page.
  await bar.locator('[data-micro="bold"]').click()
  await expect(bar.locator('[data-micro="bold"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // Drag by the grip: the place is remembered.
  const g = (await bar.locator('[data-micro="grip"]').boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + 200, g.y + 160, { steps: 6 })
  await page.mouse.up()
  const moved = (await bar.boundingBox())!
  expect(moved.y).toBeGreaterThan(g.y + 100)
  const saved = await page.evaluate(() =>
    localStorage.getItem('learning-notes:toolbar.microPos'),
  )
  expect(saved).not.toBeNull()
  // A selection hands over to the mini bar.
  await page.keyboard.press('Shift+Home')
  await expect(bar).toHaveCount(0)
})
