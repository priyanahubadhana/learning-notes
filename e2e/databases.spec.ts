import { expect, test, type Page } from '@playwright/test'
import { createNotebook, makeCard, sidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

test('All databases: new Drug list, rows open as pages with properties', async ({
  page,
}) => {
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await expect(
    main(page).getByRole('heading', { name: 'Databases' }),
  ).toBeVisible()
  await expect(main(page)).toContainText('No databases yet')

  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Drug list/ }).click()
  await expect(main(page).getByRole('textbox', { name: 'Rename' })).toHaveValue(
    'Drug list',
  )

  // Add a row, name it, open it as a page.
  await main(page).getByRole('button', { name: 'Table' }).click()
  await main(page).getByRole('button', { name: '+ New row' }).click()
  await page.getByRole('textbox', { name: /^Drug/ }).fill('Amlodipine')
  await page.getByRole('textbox', { name: /^Drug/ }).press('Enter')
  await main(page)
    .getByRole('row')
    .filter({ hasText: 'Amlodipine' })
    .getByRole('button', { name: /^Open/ })
    .click()

  // The row page shows its properties above the notes; edit one.
  const props = main(page).getByRole('region', { name: 'Properties' })
  await expect(props).toContainText('Class')
  await expect(
    main(page).getByRole('navigation', { name: 'Breadcrumb' }),
  ).toContainText('Drug list')
  await props.getByRole('button', { name: /^Class/ }).click()
  await props.getByRole('textbox').fill('Calcium blocker')
  await props.getByRole('textbox').press('Enter')
  await expect(props).toContainText('Calcium blocker')

  // Back in the hub it is listed with its row.
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await expect(main(page)).toContainText('Drug list')
  await expect(main(page)).toContainText('1 row')
})

test('All cards lists every notebook’s cards and reviews them', async ({
  page,
}) => {
  await makeCard(page, 'Which valves close in S1?', 1)
  await sidebar(page).getByRole('button', { name: 'All cards' }).click()
  await expect(
    main(page).getByRole('heading', { name: 'All cards' }),
  ).toBeVisible()
  await expect(main(page)).toContainText('Which valves close in S1?')
  await expect(main(page)).toContainText('from all your notebooks')
  await main(page)
    .getByRole('button', { name: /^Review 1 due/ })
    .click()
  await expect(
    page.getByText('Which valves close in S1?').first(),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /Show answer/ })).toBeVisible()
})

test('a lesson page shows its tracker properties and Back to auto', async ({
  page,
}) => {
  // The tracker exists once the Database tab has been opened.
  await sidebar(page)
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Database' }).click()
  await sidebar(page)
    .getByRole('button', { name: 'Heart sounds', exact: true })
    .click()

  const props = main(page).getByRole('region', { name: 'Properties' })
  await expect(props).toContainText('Not started')
  await props.getByRole('button', { name: /^Edit Status/ }).click()
  await page.getByRole('button', { name: 'Mastered' }).click()
  await expect(props).toContainText('Mastered')
  await props.getByRole('button', { name: 'Back to auto' }).click()
  await expect(props).toContainText('Not started')
  await expect(props.getByRole('button', { name: 'Back to auto' })).toHaveCount(
    0,
  )
})
