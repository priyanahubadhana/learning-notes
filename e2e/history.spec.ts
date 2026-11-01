import { expect, test } from '@playwright/test'
import { createNotebook, typeInEditor, pageAction } from './helpers.ts'

test('History lists earlier copies and restores one', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Hist NB', 'Hist page')
  await typeInEditor(page, 'First thought')

  const dialog = page.getByRole('dialog', { name: 'Page history' })
  await pageAction(page, 'History')
  await expect(dialog.getByRole('listitem')).toHaveCount(1)
  await expect(dialog.getByText('First thought')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()

  await typeInEditor(page, ' and a second one')
  await pageAction(page, 'History')
  await expect(dialog.getByRole('listitem')).toHaveCount(2)
  await expect(dialog.getByText('First thought and a second one')).toBeVisible()

  // The older copy is the second in the list.
  await dialog.getByRole('listitem').nth(1).getByRole('button').click()
  await expect(dialog.getByText('First thought and a second one')).toHaveCount(
    0,
  )
  await dialog.getByRole('button', { name: 'Restore this copy' }).click()

  await expect(dialog).toHaveCount(0)
  const editor = page.locator('.bn-editor')
  await expect(editor).toContainText('First thought')
  await expect(editor).not.toContainText('second one')
  await expect(page.getByText(/Restored the copy from/)).toBeVisible()

  // The restore can be undone: the later text is a copy too.
  await pageAction(page, 'History')
  await expect(dialog.getByRole('listitem')).toHaveCount(3)
})

test('a page nobody edited has an empty history', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Hist NB', 'Quiet page')
  await pageAction(page, 'History')
  await expect(page.getByText(/No earlier copies yet/)).toBeVisible()
})
