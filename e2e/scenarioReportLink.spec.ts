// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'

/**
 * B0 (SC-05): Settings > Try new features has a plain link to the scenario
 * report. It opens in a new tab at the fixed address /scenarios/ (the report
 * itself is published with the preview, not built by this test).
 */
test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

test('SC-05 the Try new features list links to the scenario report', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    )
  })
  await page.goto('/?flags=settings.v3#/settings/help')
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  const tap = page.locator('[data-version-tap]')
  for (let i = 0; i < 5; i++) await tap.click()
  const link = page.locator('[data-scenario-report] a')
  await expect(link).toHaveText('Test report')
  await expect(link).toHaveAttribute('href', '/scenarios/')
  await expect(link).toHaveAttribute('target', '_blank')
  const box = (await link.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(44)
})
