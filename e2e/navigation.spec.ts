import { expect, test } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openPage,
  openSidebar,
  sidebar,
} from './helpers.ts'

const title = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Page title' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await sidebar(page).waitFor({ state: 'attached' }) // the app has started
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

test('Back and Forward also follow Settings categories, database views, Save & restore and the Search text', async ({
  page,
}) => {
  const side = async () => await openSidebar(page)
  await createNotebook(page, 'Nav NB', 'First')

  // Settings: a category is its own step.
  await (await side()).getByRole('button', { name: 'Settings' }).click()
  const nav = page.getByRole('navigation', { name: 'Settings categories' })
  await nav.getByRole('button', { name: /^Review/ }).click()
  await expect(page).toHaveURL(/#\/settings\/review$/)
  await page.reload()
  await expect(nav.getByRole('button', { name: /^Review/ })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.goBack()
  await expect(nav.getByRole('button', { name: /^All/ })).toHaveAttribute(
    'aria-current',
    'page',
  )

  // A notebook's Database tab: the view is a step.
  await (
    await side()
  )
    .getByRole('button', { name: 'Nav NB', exact: true })
    .click()
  await page.getByRole('tab', { name: 'Database' }).click()
  const study = page.getByRole('region', { name: 'Study tracker' })
  await study.getByRole('button', { name: 'Board', exact: true }).click()
  await expect(page).toHaveURL(/#\/notebook\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/)
  await page.reload()
  await expect(
    study.getByRole('button', { name: 'Board', exact: true }),
  ).toBeVisible()
  const boardUrl = page.url()
  await page.goBack()
  // The view before the Board (the entry was written with its view).
  await expect(page).toHaveURL(/#\/notebook\/[^/]+\/database\/[^/]+\/[^/]+$/)
  expect(page.url()).not.toBe(boardUrl)

  // Save & restore and back.
  await (await side()).getByRole('button', { name: 'Save & restore' }).click()
  await expect(page).toHaveURL(/#\/data$/)
  await page.goBack()
  await expect(page).toHaveURL(/#\/notebook\//)

  // Search: the words typed stay in the address (no extra Back steps).
  await page.goto('/#/search')
  const box = page.getByRole('searchbox').or(page.getByRole('textbox').first())
  await box.fill('zebra')
  await expect.poll(() => page.url()).toContain('zebra')
  const entries = await page.evaluate(() => history.length)
  await box.fill('zebra crossing')
  await expect.poll(() => page.url()).toContain('crossing')
  expect(await page.evaluate(() => history.length)).toBe(entries)
  await page.reload()
  await expect(box).toHaveValue('zebra crossing')
})
