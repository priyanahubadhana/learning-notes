import { expect, test } from '@playwright/test'

/**
 * Probes: one small check per inventory feature (docs/inventory/features.json)
 * that the feature still works in the real app. The title starts with the id in
 * square brackets after "probe:"; `npm run probe:inventory` lists entries with no probe.
 */
test('[probe:flags.setFlag] a switch turned on in Settings stays on after a reload', async ({
  page,
}) => {
  await page.goto('/#/settings')
  await page
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: /^Try new features/ })
    .click()
  const row = page
    .locator('main')
    .getByRole('region', { name: 'New Home', exact: true })
  await row.getByRole('button', { name: 'On', exact: true }).click()
  await page.reload()
  await page
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: /^Try new features/ })
    .click()
  await expect(
    row.getByRole('button', { name: 'On', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
})
