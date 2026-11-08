import { expect, test, type Page } from '@playwright/test'
import { createNotebook, openSearchPopup } from './helpers.ts'

/** Polish 2, item 13: the empty screens a new user lands on have one button. */

const main = (page: Page) => page.getByRole('main')

test('no notebooks: one line and Create notebook', async ({ page }) => {
  await page.goto('/')
  const empty = page.getByTestId('no-notebooks')
  await expect(empty).toBeVisible()
  await expect(empty).toContainText('Create a notebook to begin')
  await empty.getByRole('button', { name: 'Create notebook' }).click()
  await expect(page.getByTestId('no-notebooks')).toHaveCount(0)
})

test('search with no results offers Clear search', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await openSearchPopup(page)
  await page.keyboard.type('zzzqqq')
  await page.getByRole('button', { name: /See all|Open search/ }).click()
  const empty = main(page).getByTestId('search-empty')
  await expect(empty).toBeVisible()
  await expect(empty).toContainText('No results for')
  await empty.getByRole('button', { name: 'Clear search' }).click()
  await expect(
    main(page).getByRole('searchbox', { name: 'Search everything' }),
  ).toHaveValue('')
})
