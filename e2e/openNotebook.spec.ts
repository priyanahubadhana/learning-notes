import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  closeCorner,
  cornerAction,
  createNotebook,
  showSidebar,
  sidebar,
} from './helpers.ts'

/**
 * R6-12: tapping a notebook reopens its last page (or its first page) with
 * the sidebar tree unfolded to it. The suite default is "Notebook tabs"
 * (playwright.config.ts), so these tests choose their own.
 */

const title = (page: Page) => page.getByRole('textbox', { name: 'Page title' })

async function start(page: Page, mode: 'last' | 'first') {
  await page.addInitScript((m) => {
    localStorage.setItem('learning-notes:general.openNotebookAt', `"${m}"`)
  }, mode)
  await page.goto('/')
  await sidebar(page).waitFor({ state: 'attached' })
}

async function twoNotebooks(page: Page) {
  await createNotebook(page, 'Alpha', 'A1')
  await addPage(page, 'Alpha', 'A1b', 'page')
  await createNotebook(page, 'Beta', 'B1')
  await expect(title(page)).toHaveValue('B1')
}

test('tapping a notebook reopens the page you left in it', async ({ page }) => {
  await start(page, 'last')
  await twoNotebooks(page)
  await showSidebar(page)
  await sidebar(page)
    .getByRole('button', { name: 'Alpha', exact: true })
    .click()
  await expect(title(page)).toHaveValue('A1b')
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: 'A1b', exact: true }),
  ).toBeVisible()
})

test('First page opens the first page of the notebook', async ({ page }) => {
  await start(page, 'first')
  await twoNotebooks(page)
  await showSidebar(page)
  await sidebar(page)
    .getByRole('button', { name: 'Alpha', exact: true })
    .click()
  await expect(title(page)).toHaveValue('A1')
})

test('Settings › General has Open notebooks at', async ({ page }) => {
  await start(page, 'last')
  await cornerAction(page, 'Settings')
  await expect(page.getByText('Open notebooks at').first()).toBeVisible()
  await closeCorner(page)
})
