import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { selectText, sidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const sheet = (page: Page) => main(page).getByRole('region', { name: 'Revise' })

/** Opens Backup & files and loads the sample notebook. */
async function loadSample(page: Page) {
  await page.goto('/')
  await sidebar(page).getByRole('button', { name: 'Backup & files' }).click()
  await main(page)
    .getByRole('region', { name: 'For testing: sample notebook' })
    .getByRole('button', { name: 'Load sample notebook' })
    .click()
  await expect(
    page.getByText('Added the sample notebook “Sample notebook”.'),
  ).toBeVisible()
}

async function openRevise(page: Page, notebook = 'Sample notebook') {
  await sidebar(page)
    .getByRole('button', { name: notebook, exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Revise' }).click()
}

test('the five 5B checks, on the sample notebook', async ({ page }) => {
  await loadSample(page)

  // 1. Marks: the sample's marked words are on the Revise sheet; mark one more.
  await openRevise(page)
  await expect(
    sheet(page).getByRole('button', { name: /^Heart sounds\s*4$/ }),
  ).toBeVisible()
  await sidebar(page)
    .getByRole('button', { name: 'Heart sounds', exact: true })
    .click()
  await expect(page.locator('.bn-editor')).toContainText('A murmur in a child')
  await selectText(page, 'murmur')
  await page.getByRole('button', { name: 'Key point', exact: true }).click()
  await page.waitForTimeout(800)
  await openRevise(page)
  await expect(
    sheet(page).getByRole('button', { name: /^Heart sounds\s*5$/ }),
  ).toBeVisible()
  await expect(
    sheet(page).getByRole('region', { name: 'Key point' }),
  ).toContainText('murmur')

  // 2. CSV: export the reading list, add its rows again by importing the file.
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await main(page)
    .getByRole('button', { name: /^Reading list/ })
    .click()
  const downloading = page.waitForEvent('download')
  await main(page).getByRole('button', { name: 'Database options' }).click()
  await page.getByRole('menuitem', { name: 'Export as CSV' }).click()
  const csv = await downloading
  const csvPath = await csv.path()
  const text = await readFile(csvPath, 'utf8')
  expect(text).toContain('Book,Author,Read on,Cover')
  expect(text).toContain('https://picsum.photos/seed/learning-notes-1/320/200')
  await main(page).getByRole('button', { name: 'Database options' }).click()
  await page.getByRole('menuitem', { name: 'Import CSV…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import CSV' })
  await dialog.getByLabel('CSV file').setInputFiles(csvPath)
  await expect(dialog).toContainText('5 rows found.')
  await expect(dialog.getByLabel('What “Cover” becomes')).toHaveValue(
    /^column:/,
  )
  await dialog.getByRole('button', { name: 'Import 5 rows' }).click()
  await expect(page.getByText('Imported 5 rows.')).toBeVisible()
  await main(page).getByRole('button', { name: 'Table', exact: true }).click()
  await expect(
    main(page).getByRole('row').filter({ hasText: 'Respiratory Physiology' }),
  ).toHaveCount(2)

  // 3. Backup & files: save the notebook, bring it back as a copy.
  await sidebar(page).getByRole('button', { name: 'Backup & files' }).click()
  const saving = page.waitForEvent('download')
  const save = main(page).getByRole('region', {
    name: 'Save a notebook as a file',
  })
  await save
    .getByLabel('Notebook to save')
    .selectOption({ label: 'Sample notebook' })
  await save.getByRole('button', { name: 'Save file' }).click()
  const file = await saving
  expect(file.suggestedFilename()).toBe('Sample notebook.learningnotes.json')
  const bundle = JSON.parse(await readFile(await file.path(), 'utf8'))
  expect(bundle.cards).toHaveLength(4)
  await main(page)
    .getByLabel('File to import')
    .setInputFiles(await file.path())
  await expect(
    page.getByText(/Imported 1 notebooks, \d+ pages and 4 cards/),
  ).toBeVisible()
  await openRevise(page, 'Sample notebook (imported)')
  // The copy keeps the original marks (the extra "murmur" mark was saved before the export).
  await expect(
    sheet(page).getByRole('button', { name: /^Heart sounds\s*5$/ }),
  ).toBeVisible()
  await expect(
    sheet(page).getByRole('region', { name: 'Formula' }),
  ).toContainText('CO = HR × SV')

  // 4. Views: Calendar and Gallery on the reading list.
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await main(page)
    .getByRole('button', { name: /^Reading list/ })
    .first()
    .click()
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  await expect(
    main(page).locator('[data-calendar-day] li button').first(),
  ).toBeVisible()
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Gallery' })
    .click()
  await expect(main(page).locator('li img').first()).toBeVisible()
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  // 5. Screenshots of the sample in each theme and at phone width.
  test(`screenshots of the sample: ${theme} ${width}×${height}`, async ({
    page,
  }) => {
    await loadSample(page)
    await sidebar(page)
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    const shot = async (name: string) => {
      await page.waitForTimeout(500)
      await page.screenshot({
        path: `test-results/screens/sample-${name}-${theme}-${width}x${height}.png`,
        fullPage: true,
      })
      const overflow = await page.evaluate(
        () =>
          document.querySelector('main')!.scrollWidth -
          document.querySelector('main')!.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    }
    const phone = width < 500
    // On a phone this screen covers the sidebar until it is closed.
    if (phone)
      await main(page)
        .getByRole('button', { name: 'Close', exact: true })
        .click()
    await openRevise(page)
    await shot('revise')
    await main(page).getByRole('tab', { name: 'Cards' }).click()
    await shot('cards')
    await main(page).getByRole('tab', { name: 'Database' }).click()
    await shot('tracker')
    if (phone)
      await page.getByRole('button', { name: 'Close notebook' }).click()
    await sidebar(page).getByRole('button', { name: 'Databases' }).click()
    await main(page)
      .getByRole('button', { name: /^Reading list/ })
      .click()
    for (const type of ['Calendar', 'Gallery']) {
      await main(page).getByRole('button', { name: '+ View' }).click()
      await page
        .getByRole('dialog', { name: 'Add a view' })
        .getByRole('button', { name: type })
        .click()
      await shot(type.toLowerCase())
    }
  })
}
