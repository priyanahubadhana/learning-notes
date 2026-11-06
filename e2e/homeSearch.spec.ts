import { expect, test } from '@playwright/test'
import { closeCorner, openSearchPopup } from './helpers.ts'

test('the Tasks chip of Search finds a task and opens Home', async ({
  page,
}) => {
  await page.goto('/')
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await page.getByTestId('quick-add').fill('Renew library card')
  await page.getByTestId('quick-add').press('Enter')
  await expect(page.getByTestId('task-row')).toHaveCount(1)

  await page.locator('[data-space="notebooks"]').click()
  await openSearchPopup(page)
  const dialog = page.getByRole('dialog', { name: 'Search' })
  await dialog.getByRole('button', { name: 'Tasks', exact: true }).click()
  await dialog
    .getByRole('combobox', { name: 'Search everything' })
    .fill('library')
  await dialog.getByTestId('task-results').getByRole('button').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await expect(
    page.getByTestId('task-row').filter({ hasText: 'Renew library card' }),
  ).toBeVisible()
})
