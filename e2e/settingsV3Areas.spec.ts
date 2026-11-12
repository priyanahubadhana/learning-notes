// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/** Settings v3: today's Account, Sync, Lock, AI, Connections, Permissions screens show inside their sections. */

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

const areas = [
  ['lock', 'lock'],
  ['ai', 'ai'],
  ['apis', 'apis'],
  ['permissions', 'permissions'],
  ['claude', 'claude'],
  ['account', 'account'],
  ['sync', 'sync'],
  ['general', 'device'],
] as const

for (const [section, area] of areas) {
  test(`section ${section} shows today's ${area} screen`, async ({ page }) => {
    await page.goto(`/?flags=settings.v3#/settings/${section}`)
    await page.getByRole('button', { name: 'Hide menu' }).click()
    await expect(page.locator(`[data-area="${area}"]`)).toBeVisible()
    await expect(page.locator(`[data-area="${area}"] *`).first()).toBeVisible()
  })
}

test('AI links move between v3 sections', async ({ page }) => {
  await page.goto('/?flags=settings.v3#/settings/apis')
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(page.locator('[data-area="apis"]')).toBeVisible()
  await page.locator('[data-area="apis"]').getByTestId('conn-manage').click()
  await expect(page.locator('[data-section="ai"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
})
