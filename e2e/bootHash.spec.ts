import { expect, test } from '@playwright/test'

/**
 * A link opened while the app is still starting must be followed, not
 * overwritten with the Home screen. (Before the fix the app wrote its own
 * address over the new one in about 1 start in 8, which made specs that
 * reload and then open a settings page fail at random.)
 */
test('an address set right after a reload is followed, every time', async ({
  page,
}) => {
  await page.goto('/')
  for (let i = 0; i < 8; i++) {
    await page.reload()
    await page.goto('/#/settings/ai')
    await expect(page.getByTestId('ai-section')).toBeVisible()
    expect(page.url()).toContain('#/settings/ai')
    await page.goto('/#/')
  }
})
