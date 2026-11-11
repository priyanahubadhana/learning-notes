import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, openSidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

/** Puts a ready-made database on the open page with /database. */
async function placeDatabase(page: Page, pick: RegExp) {
  await page.locator('.bn-editor').first().click()
  await page.keyboard.type('/database')
  await page.keyboard.press('Enter')
  await page
    .getByRole('dialog', { name: 'Add a database' })
    .getByRole('option', { name: pick })
    .click()
}

test('Notebook Database tab: a filter by page narrows the databases', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await placeDatabase(page, /^Drug list/)
  await expect(page.getByRole('region', { name: 'Drug list' })).toBeVisible()
  await addPage(page, 'Cardiology', 'ECG basics')
  await placeDatabase(page, /^Vocabulary/)
  await expect(page.getByRole('region', { name: 'Vocabulary' })).toBeVisible()

  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page)
    .getByRole('tablist', { name: 'Notebook tabs' })
    .getByRole('tab', { name: 'Database', exact: true })
    .click()
  const group = main(page).getByRole('group', {
    name: 'Databases in this notebook',
  })
  await expect(group.getByRole('button')).toHaveCount(3) // tracker + 2
  const filter = main(page).locator('[data-db-page-filter]')
  await filter.selectOption({ label: 'ECG basics' })
  await expect(group.getByRole('button')).toHaveCount(0)
  await expect(
    main(page).getByRole('region', { name: 'Vocabulary' }),
  ).toBeVisible()
  await expect(
    main(page).getByRole('region', { name: 'Drug list' }),
  ).toHaveCount(0)
  await filter.selectOption({ label: 'Heart sounds' })
  await expect(
    main(page).getByRole('region', { name: 'Drug list' }),
  ).toBeVisible()
  await filter.selectOption('')
  await expect(group.getByRole('button')).toHaveCount(3)
})
