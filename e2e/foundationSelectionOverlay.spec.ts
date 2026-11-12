import { expect, test } from '@playwright/test'

/**
 * Slices 0e and 0f add the selection store and the overlay manager without
 * moving anything onto them: the app starts as before, and neither module is
 * downloaded at start-up (spec: docs/features/foundation-selection-overlay.md).
 */
test('the app starts unchanged and loads no selection or overlay module', async ({
  page,
}) => {
  const loaded: string[] = []
  page.on('request', (r) => loaded.push(r.url()))
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  await page.waitForLoadState('networkidle')
  const ours = loaded.filter((u) => /\/src\/app\/(selection|overlay)\//.test(u))
  expect(ours).toEqual([])
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--z-card'),
    ),
  ).toBe('')
})
