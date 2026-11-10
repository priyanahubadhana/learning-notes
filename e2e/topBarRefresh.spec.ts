import { expect, test } from '@playwright/test'
import { cornerAction } from './helpers.ts'

// Item 18: a Refresh button in the top bar, off by default, switched on in
// Settings › Advanced; the gear menu keeps Refresh app.

test('the top bar Refresh button is off by default and turned on in Settings', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByTestId('topbar-refresh')).toHaveCount(0)
  await cornerAction(page, 'Settings')
  const row = page.locator('main').getByRole('region', {
    name: 'Show Refresh button in the top bar',
    exact: true,
  })
  await row.getByRole('button', { name: 'On', exact: true }).click()
  await expect(page.getByTestId('topbar-refresh')).toBeVisible()
  // It reloads the app (saves first) and the choice survives.
  await page.evaluate(() => {
    ;(window as unknown as Record<string, number>).__before = 1
  })
  await page.getByTestId('topbar-refresh').click()
  await expect
    .poll(() =>
      page
        .evaluate(() => !(window as unknown as Record<string, number>).__before)
        .catch(() => true),
    )
    .toBe(true)
  await expect(page.getByTestId('topbar-refresh')).toBeVisible()
})
