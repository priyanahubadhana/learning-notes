import { expect, test } from '@playwright/test'
import { openSidebar } from './helpers.ts'

test('the sample notebook is shown in the chosen language', async ({
  page,
}) => {
  await page.goto('/')
  const side = await openSidebar(page)
  await side.getByRole('button', { name: 'Save & restore' }).click()
  await page.getByRole('button', { name: 'Load sample notebook' }).click()
  await expect(
    side.getByRole('button', { name: 'Heart sounds', exact: true }),
  ).toBeVisible()

  await side.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Español', exact: true }).click()
  await expect(
    side.getByRole('button', { name: 'Sonidos cardíacos', exact: true }),
  ).toBeVisible()
  await expect(
    side.getByRole('button', { name: 'Cuaderno de ejemplo', exact: true }),
  ).toBeVisible()
})
