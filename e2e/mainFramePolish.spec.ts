// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { addBox, rect, selectMain, start } from './cBoxesHelpers.ts'

/**
 * Polish 2B (switch textbox.v2), the page's first box when selected or typing:
 * (1) the frame keeps a small even gap round the words and grows outward (the
 * words do not move); (2) its tab never covers the page's own Notes / Summary /
 * Review tabs: it moves below the box when there is no room above.
 */
test.use({ viewport: { width: 820, height: 1180 } })

test('the first box frame has an even gap round its words and the words stay', async ({
  page,
}) => {
  await start(page, 'Frame gap')
  const main = page.locator('[data-paper-box="main"]')
  const words = async () => rect(main.locator('.bn-inline-content').first())
  const before = await words()
  await main.locator('.bn-editor').click()
  await expect(page.locator('[data-main-frame]')).toBeVisible()
  const f = await rect(page.locator('[data-main-frame]'))
  const w = await words()
  // The words did not move when the frame showed.
  expect(Math.abs(w.x - before.x)).toBeLessThan(1)
  expect(Math.abs(w.y - before.y)).toBeLessThan(1)
  // Same gap as a box beside it (words to frame: sides and top).
  const other = await addBox(page, ['One'])
  await other.locator('.bn-editor').click()
  const of = await rect(other.locator('[data-box-frame]').first())
  const ow = await rect(other.locator('.bn-inline-content').first())
  expect(Math.abs(w.x - f.x - (ow.x - of.x))).toBeLessThan(2)
  expect(Math.abs(w.y - f.y - (ow.y - of.y))).toBeLessThan(2)
})

test('the first box tab never covers the page tabs', async ({ page }) => {
  await start(page, 'Tab room')
  await selectMain(page)
  const tabs = await rect(page.locator('[data-page-tabs]'))
  const grip = await rect(page.locator('[data-main-chrome] [data-box-grip]'))
  // Q-1: the first box's ⋯ is on its bar.
  const menu = await rect(page.getByTestId('ob-boxmore'))
  for (const r of [grip, menu])
    expect(r.y >= tabs.y + tabs.height - 0.5 || r.y + r.height <= tabs.y).toBe(
      true,
    )
})

test('Q-2: while typing the first box shows only its thin frame', async ({
  page,
}) => {
  await start(page, 'Typing hides')
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  await expect(page.locator('[data-main-frame]')).toBeVisible()
  await expect(page.locator('[data-main-chrome] [data-box-grip]')).toHaveCount(
    0,
  )
  await expect(page.locator('[data-main-chrome] [data-box-menu]')).toHaveCount(
    0,
  )
  await expect(
    page.locator('[data-main-chrome] [data-resize-handle]'),
  ).toHaveCount(0)
})
