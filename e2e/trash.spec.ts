import { expect, test } from '@playwright/test'
import {
  addPage,
  confirmDialog,
  createNotebook,
  openPage,
  openTrash,
  rowAction,
  sidebar,
  trashAction,
  trashEntries,
  typeInEditor,
} from './helpers.ts'

// The four Trash browser checks from Phase 1, automated.

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('restore brings back a page with its sub-page and text', async ({
  page,
}) => {
  await createNotebook(page, 'Test NB', 'Parent')
  await addPage(page, 'Parent', 'Child', 'sub-page')
  await typeInEditor(page, 'child text')

  await rowAction(page, 'Parent', 'Delete page')
  await confirmDialog(page, 'Delete')

  await openTrash(page)
  // Only what was deleted directly is listed (not the sub-page).
  expect(await trashEntries(page)).toEqual(['Parent — in Test NB'])

  await trashAction(page, 'Parent', 'Restore')
  await expect(sidebar(page).getByText('Trash is empty')).toBeVisible()
  await openPage(page, 'Child')
  await expect(page.locator('.bn-editor')).toContainText('child text')
})

test('delete forever asks first, and the page never comes back', async ({
  page,
}) => {
  await createNotebook(page, 'Test NB', 'Keep')
  await addPage(page, 'Test NB', 'Test delete')
  await typeInEditor(page, 'some text')

  await rowAction(page, 'Test delete', 'Delete page')
  await confirmDialog(page, 'Delete')
  await openTrash(page)

  // Cancel keeps it in Trash.
  await trashAction(page, 'Test delete', 'Delete forever')
  await expect(page.getByRole('dialog')).toContainText(
    'Delete “Test delete” forever?',
  )
  await confirmDialog(page, 'Cancel')
  expect(await trashEntries(page)).toEqual(['Test delete — in Test NB'])

  // Delete forever removes it, also after a reload.
  await trashAction(page, 'Test delete', 'Delete forever')
  await confirmDialog(page, 'Delete forever')
  await expect(sidebar(page).getByText('Trash is empty')).toBeVisible()

  await page.reload()
  await openTrash(page)
  await expect(sidebar(page).getByText('Trash is empty')).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'Test delete', exact: true }),
  ).toHaveCount(0)
})

test('restoring a notebook brings back all its pages and text', async ({
  page,
}) => {
  await createNotebook(page, 'Test NB', 'Page 1')
  await typeInEditor(page, 'first page text')
  await addPage(page, 'Test NB', 'Page 2')

  await rowAction(page, 'Test NB', 'Delete notebook')
  await confirmDialog(page, 'Delete')

  await openTrash(page)
  expect(await trashEntries(page)).toEqual(['Test NB — 2 pages'])

  await trashAction(page, 'Test NB', 'Restore')
  await expect(sidebar(page).getByText('Trash is empty')).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'Page 2', exact: true }),
  ).toBeVisible()
  await openPage(page, 'Page 1')
  await expect(page.locator('.bn-editor')).toContainText('first page text')
})

test('restoring a page whose notebook is in Trash brings back only that notebook', async ({
  page,
}) => {
  await createNotebook(page, 'Test NB2', 'Keep me')
  await addPage(page, 'Test NB2', 'Leave me')

  await rowAction(page, 'Keep me', 'Delete page')
  await confirmDialog(page, 'Delete')
  await rowAction(page, 'Test NB2', 'Delete notebook')
  await confirmDialog(page, 'Delete')

  await openTrash(page)
  expect(await trashEntries(page)).toEqual([
    'Test NB2 — 1 page',
    'Keep me — in Test NB2',
  ])

  await trashAction(page, 'Keep me', 'Restore')
  await expect(
    sidebar(page).getByRole('button', { name: 'Test NB2', exact: true }),
  ).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'Keep me', exact: true }),
  ).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'Leave me', exact: true }),
  ).toHaveCount(0)
  expect(await trashEntries(page)).toEqual(['Leave me — in Test NB2'])
})
