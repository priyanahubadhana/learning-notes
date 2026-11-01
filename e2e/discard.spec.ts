import { expect, test } from '@playwright/test'
import { createNotebook, openSidebar, pageAction } from './helpers.ts'

test('a click outside a dialog closes it only if nothing was typed', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  const dialog = page.getByRole('dialog', { name: /template/i })
  const open = () => pageAction(page, 'Save as template')

  // Nothing typed: the click outside simply closes it.
  await open()
  await expect(dialog).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(dialog).toHaveCount(0)

  // Something typed: it asks first; "Keep editing" goes back to it.
  await open()
  await dialog.getByRole('textbox').fill('My own template')
  await page.mouse.click(5, 5)
  const asking = page.getByRole('dialog', { name: /Discard your changes/ })
  await expect(page.getByText('Discard your changes?')).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(dialog.getByRole('textbox')).toHaveValue('My own template')
  await expect(asking).toHaveCount(0)

  // "Discard" closes it without saving anything.
  await page.mouse.click(5, 5)
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(
    (await openSidebar(page)).getByText('My own template'),
  ).toHaveCount(0)
})
