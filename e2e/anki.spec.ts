import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, makeCard, openMore, openSidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

test('Anki: save a notebook for Anki, then bring that file in as a new notebook', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Save & restore' })
    .click()
  await openMore(page)

  const anki = main(page).getByRole('region', { name: 'Anki' })
  const downloading = page.waitForEvent('download')
  await anki.getByRole('button', { name: 'Save for Anki' }).click()
  const file = await downloading
  expect(file.suggestedFilename()).toBe('Cardiology.apkg')
  const bytes = await readFile(await file.path())
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK') // a zip

  await anki.getByLabel('Import from Anki').setInputFiles(await file.path())
  await expect(page.getByText(/Imported 1 cards from Anki/)).toBeVisible()

  // A file that is not an Anki package is refused in plain words.
  await anki.getByLabel('Import from Anki').setInputFiles({
    name: 'notes.apkg',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a zip'),
  })
  await expect(main(page).getByRole('alert')).toContainText(
    'not an Anki package',
  )
})

test('Anki: a notebook without cards cannot be saved', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Plain', 'Page')
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Save & restore' })
    .click()
  await openMore(page)
  await main(page)
    .getByRole('region', { name: 'Anki' })
    .getByRole('button', { name: 'Save for Anki' })
    .click()
  await expect(main(page).getByRole('alert')).toContainText('no cards')
})
