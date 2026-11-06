// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * A4: the bars live outside the page scroller, so a smaller viewport (the
 * on-screen keyboard) never moves the top bar, and Undo never focuses the page.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

test('the top bar stays put when the viewport shrinks and grows', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  const top = () =>
    page
      .locator('[data-main-bar]')
      .evaluate((el) => Math.round(el.getBoundingClientRect().top))
  const before = await top()
  await page.setViewportSize({ width: 1024, height: 560 })
  expect(await top()).toBe(before)
  await page.setViewportSize({ width: 1024, height: 900 })
  expect(await top()).toBe(before)
})

test('Undo from the bar does not put focus into the page', async ({ page }) => {
  await openNote(page, 'pencil')
  await tool(page, 'Pen').click()
  const active = () =>
    page.evaluate(
      () => !!document.activeElement?.closest('[data-page-content]'),
    )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  expect(await active()).toBe(false)
})
