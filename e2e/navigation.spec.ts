import { expect, test } from '@playwright/test'
import { addPage, createNotebook, openPage, sidebar } from './helpers.ts'

const title = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Page title' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Back and Forward move between pages and screens', async ({ page }) => {
  await createNotebook(page, 'Nav NB', 'First')
  await addPage(page, 'Nav NB', 'Second')
  await sidebar(page).getByRole('button', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/#\/settings$/)

  await page.goBack()
  await expect(title(page)).toHaveValue('Second')
  await expect(page).toHaveURL(/#\/page\//)
  await page.goBack()
  await expect(title(page)).toHaveValue('First')
  await page.goForward()
  await expect(title(page)).toHaveValue('Second')
})

test('a refresh keeps the screen, the notebook tab and the page', async ({
  page,
}) => {
  await createNotebook(page, 'Nav NB', 'First')
  await sidebar(page)
    .getByRole('button', { name: 'Nav NB', exact: true })
    .click()
  await expect(page).toHaveURL(/#\/notebook\//)
  const tabs = page.getByRole('tablist', { name: 'Notebook tabs' })
  await tabs.getByRole('tab', { name: 'Cards', exact: true }).click()
  await expect(page).toHaveURL(/#\/notebook\/[^/]+\/[^/]+$/)

  await page.reload()
  await expect(
    tabs.getByRole('tab', { name: 'Cards', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')

  // Back goes to the tab before.
  await page.goBack()
  await expect(
    tabs.getByRole('tab', { name: 'Notes', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')

  await openPage(page, 'First')
  await page.reload()
  await expect(title(page)).toHaveValue('First')
})

test('an address to a missing page shows Home with a message', async ({
  page,
}) => {
  await page.goto('/#/page/does-not-exist')
  await expect(
    page.getByText('That page or notebook no longer exists.'),
  ).toBeVisible()
  await expect(page).toHaveURL(/#\/$/)
})

test('a search address restores the search', async ({ page }) => {
  await page.goto(
    '/#/search?q=' +
      encodeURIComponent(JSON.stringify({ text: 'zebra', type: 'all' })),
  )
  await expect(
    page.getByRole('searchbox').or(page.getByRole('textbox').first()),
  ).toHaveValue('zebra')
})
