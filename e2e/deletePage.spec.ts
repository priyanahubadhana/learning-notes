import { expect, test } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openPage,
  pageAction,
  row,
  rowAction,
  showSidebar,
  sidebar,
} from './helpers.ts'

// Owner request (9 Nov): Delete page in the page menu, a ✕ in the sidebar
// that is reachable at any width, and Undo that brings it back.

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('page menu: Delete page moves it (and sub-pages) to Trash, Undo restores', async ({
  page,
}) => {
  await createNotebook(page, 'Delete NB', 'Parent')
  await addPage(page, 'Parent', 'Child', 'sub-page')
  await openPage(page, 'Parent')
  await pageAction(page, 'Delete page')
  const toast = page.getByRole('status')
  await expect(toast).toContainText('1 sub-page')
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: 'Parent', exact: true }),
  ).toHaveCount(0)
  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(
    sidebar(page).getByRole('button', { name: 'Parent', exact: true }),
  ).toBeVisible()
})

test('page menu: the old Coming soon Import now opens Save & restore', async ({
  page,
}) => {
  await createNotebook(page, 'Import NB', 'Page one')
  await page.getByRole('button', { name: 'More options' }).click()
  const item = page.getByRole('menuitem', { name: /^Import/ })
  await expect(item).toBeEnabled()
  await expect(item).not.toContainText('Coming soon')
})

test('sidebar ✕ is reachable at a narrow width and Undo restores', async ({
  page,
}) => {
  await createNotebook(page, 'Narrow NB', 'Keep')
  await addPage(page, 'Narrow NB', 'Remove me')
  await showSidebar(page)
  const r = row(page, 'Remove me')
  await r.hover()
  // At the default (narrow) width the extras sit in ⋯; ✕ and + stay.
  await expect(r.getByLabel('Move up', { exact: true })).toBeHidden()
  await expect(r.getByLabel('Add sub-page', { exact: true })).toBeVisible()
  await r.getByLabel('Delete page', { exact: true }).click()
  await expect(
    sidebar(page).getByRole('button', { name: 'Remove me', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(
    sidebar(page).getByRole('button', { name: 'Remove me', exact: true }),
  ).toBeVisible()
})

test('sidebar: a locked page refuses with a message', async ({ page }) => {
  await createNotebook(page, 'Lock NB', 'Locked one')
  await pageAction(page, 'Lock editing')
  await rowAction(page, '🔏 Locked one', 'Delete page')
  await expect(page.getByRole('status')).toContainText('locked')
})
