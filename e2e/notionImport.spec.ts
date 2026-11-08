import { zipSync } from 'fflate'
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, openMore, cornerAction } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const enc = (s: string) => new TextEncoder().encode(s)
const ID1 = 'a'.repeat(32)
const ID2 = 'b'.repeat(32)

function notionZip() {
  return Buffer.from(
    zipSync({
      [`Home ${ID1}.md`]: enc(
        `# Home\n\nSee [Child](Home%20${ID1}/Child%20${ID2}.md)\n\n<details>\n<summary>Fold</summary>\n\nHidden\n\n</details>\n`,
      ),
      [`Home ${ID1}/Child ${ID2}.md`]: enc('# Child\n\nHello\n'),
      [`Tasks ${'c'.repeat(32)}.csv`]: enc('Name,Done\nOne,Yes\nTwo,No\n'),
    }),
  )
}

test('Import Notion export: preview, import into a new notebook, then Undo', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Mine', 'First')
  await cornerAction(page, 'Save & restore')
  await openMore(page)
  const notion = main(page).getByRole('region', { name: 'Notion' })
  // A file that is not a zip is refused in plain words.
  await notion.getByLabel('Import Notion export').setInputFiles({
    name: 'bad.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('nope'),
  })
  await expect(notion.getByRole('alert')).toContainText('could not be read')
  await notion.getByLabel('Import Notion export').setInputFiles({
    name: 'My export.zip',
    mimeType: 'application/zip',
    buffer: notionZip(),
  })
  await expect(page.getByRole('dialog')).toContainText(
    '2 pages, 1 databases (2 rows)',
  )
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import Notion export' })
    .click()
  await expect(
    page.getByText('Imported 2 pages, 1 databases and 2 rows.'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'My export' }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'My export' })).toHaveCount(0)
})
