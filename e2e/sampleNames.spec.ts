import { expect, test } from '@playwright/test'
import { openMore, openSidebar, cornerAction } from './helpers.ts'

test('the sample notebook is shown in the chosen language', async ({
  page,
}) => {
  await page.goto('/')
  const side = await openSidebar(page)
  await cornerAction(page, 'Save & restore')
  await openMore(page)
  await page.getByRole('button', { name: 'Load sample notebook' }).click()
  await expect(
    side.getByRole('button', { name: 'Heart sounds', exact: true }),
  ).toBeVisible()

  await cornerAction(page, 'Settings')
  await page.getByRole('button', { name: 'Español', exact: true }).click()
  await expect(
    side.getByRole('button', { name: 'Sonidos cardíacos', exact: true }),
  ).toBeVisible()
  await expect(
    side.getByRole('button', { name: 'Cuaderno de ejemplo', exact: true }),
  ).toBeVisible()
})
