import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { createNotebook, pageAction, typeInEditor } from './helpers.ts'

test('Export: a page as Markdown, Word and Text downloads a file', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'The first sound closes the valves')

  await pageAction(page, 'Export')
  const dialog = page.getByRole('dialog', { name: 'Export' })
  await expect(dialog).toBeVisible()

  await dialog.getByTestId('export-md').click()
  await expect(dialog.getByTestId('export-ready')).toContainText(
    'Heart sounds.md',
  )
  let downloading = page.waitForEvent('download')
  await dialog.getByTestId('export-save').click()
  let file = await downloading
  expect(file.suggestedFilename()).toBe('Heart sounds.md')
  expect(await readFile(await file.path(), 'utf8')).toContain(
    '# Heart sounds\n\nThe first sound closes the valves',
  )

  await dialog.getByRole('button', { name: 'Another format' }).click()
  await dialog.getByTestId('export-docx').click()
  downloading = page.waitForEvent('download')
  await dialog.getByTestId('export-save').click()
  file = await downloading
  expect(file.suggestedFilename()).toBe('Heart sounds.docx')
  const bytes = await readFile(await file.path())
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK') // a zip

  await dialog.getByRole('button', { name: 'Another format' }).click()
  await dialog.getByTestId('export-txt').click()
  downloading = page.waitForEvent('download')
  await dialog.getByTestId('export-save').click()
  file = await downloading
  expect(await readFile(await file.path(), 'utf8')).toContain(
    'The first sound closes the valves',
  )
})

test('Export: PDF offers the print window', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'Hello')
  await pageAction(page, 'Export')
  const dialog = page.getByRole('dialog', { name: 'Export' })
  await dialog.getByTestId('export-pdf').click()
  await expect(dialog.getByTestId('export-print')).toBeVisible()
  // The print window itself cannot be seen by a test; its frame can.
  await dialog.getByTestId('export-print').click()
  await expect(page.locator('iframe[aria-hidden="true"]')).toHaveCount(1)
})
