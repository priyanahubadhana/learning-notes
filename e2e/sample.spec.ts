import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  addAsCopies,
  openMore,
  selectText,
  sidebar,
  openSidebar,
} from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const sheet = (page: Page) => main(page).getByRole('region', { name: 'Revise' })

/** Opens Save & restore and loads the sample notebook. */
async function loadSample(page: Page) {
  await page.goto('/')
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Save & restore' })
    .click()
  await openMore(page)
  await main(page)
    .getByRole('region', { name: 'For testing: sample notebook' })
    .getByRole('button', { name: 'Load sample notebook' })
    .click()
  await expect(
    page.getByText('Added the sample notebook “Sample notebook”.'),
  ).toBeVisible()
}

async function openRevise(page: Page, notebook = 'Sample notebook') {
  await (
    await openSidebar(page)
  )
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
  await (
    await openSidebar(page)
  )
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
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
  await main(page)
    .getByRole('button', { name: /^Reading list/ })
    .click()
  const downloading = page.waitForEvent('download')
  await main(page).getByRole('button', { name: 'Import / Export' }).click()
  await page.getByRole('menuitem', { name: 'Export as CSV' }).click()
  const csv = await downloading
  const csvPath = await csv.path()
  const text = await readFile(csvPath, 'utf8')
  expect(text).toContain('Book,Author,Read on,Cover')
  expect(text).toContain('https://picsum.photos/seed/learning-notes-1/320/200')
  await main(page).getByRole('button', { name: 'Import / Export' }).click()
  await page.getByRole('menuitem', { name: 'Import CSV…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import CSV' })
  await dialog.getByLabel('Choose a CSV file').setInputFiles(csvPath)
  await expect(dialog).toContainText('5 rows found.')
  await expect(dialog.getByLabel('What “Cover” becomes')).toHaveValue(
    /^column:/,
  )
  // The default is a new database; this check adds to the same one.
  await dialog.getByRole('radio', { name: /^Add rows/ }).check()
  await dialog.getByRole('button', { name: 'Import 5 rows' }).click()
  await expect(page.getByText('Imported 5 rows.')).toBeVisible()
  await main(page).getByRole('button', { name: 'Table', exact: true }).click()
  await expect(
    main(page).getByRole('row').filter({ hasText: 'Respiratory Physiology' }),
  ).toHaveCount(2)

  // 3. Save & restore: save the notebook, bring it back as a copy.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Save & restore' })
    .click()
  await openMore(page)
  const saving = page.waitForEvent('download')
  const save = main(page).getByRole('region', {
    name: 'Share one notebook',
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
    .getByLabel('Open saved file')
    .setInputFiles(await file.path())
  await addAsCopies(page)
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
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
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
    await (
      await openSidebar(page)
    )
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
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name: 'Databases' })
      .click()
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

test('sample notebook: its databases show in the Database tab; second copy warns; Remove asks and removes only the sample', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Mine', 'My page')
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Save & restore' })
    .click()
  await openMore(page)
  const box = main(page).getByRole('region', {
    name: 'For testing: sample notebook',
  })
  await expect(
    box.getByRole('button', { name: 'Remove sample notebook' }),
  ).toBeDisabled()
  await box.getByRole('button', { name: 'Load sample notebook' }).click()
  await expect(
    page.getByText('Added the sample notebook “Sample notebook”.'),
  ).toBeVisible()

  // The notebook's Database tab lists the Study tracker and the Reading list.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Sample notebook', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Database' }).click()
  const picker = main(page).getByRole('group', {
    name: 'Databases in this notebook',
  })
  await expect(picker.getByRole('button')).toHaveText([
    'Study tracker',
    'Reading list',
  ])
  await picker.getByRole('button', { name: 'Reading list' }).click()
  await main(page).getByRole('button', { name: 'Table', exact: true }).click()
  await expect(
    main(page).getByRole('row').filter({ hasText: 'Respiratory Physiology' }),
  ).toHaveCount(1)

  // A second copy asks first.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Save & restore' })
    .click()
  await openMore(page)
  await box.getByRole('button', { name: 'Load sample notebook' }).click()
  await expect(
    page.getByText('You already have a sample notebook. Add another?'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    sidebar(page).getByRole('button', { name: 'Sample notebook', exact: true }),
  ).toHaveCount(1)
  await box.getByRole('button', { name: 'Load sample notebook' }).click()
  await page.getByRole('button', { name: 'Add another' }).click()
  await expect(
    sidebar(page).getByRole('button', { name: 'Sample notebook', exact: true }),
  ).toHaveCount(2)

  // Remove asks, then removes the samples and nothing else.
  await box.getByRole('button', { name: 'Remove sample notebook' }).click()
  await expect(
    page.getByText(/Only what the sample added moves to the Trash/),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    sidebar(page).getByRole('button', { name: 'Sample notebook', exact: true }),
  ).toHaveCount(2)
  await box.getByRole('button', { name: 'Remove sample notebook' }).click()
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByText('Removed 2 sample notebooks.')).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'Sample notebook', exact: true }),
  ).toHaveCount(0)
  await expect(
    sidebar(page).getByRole('button', { name: 'Mine', exact: true }),
  ).toBeVisible()
  await expect(
    sidebar(page).getByRole('button', { name: 'My page', exact: true }),
  ).toBeVisible()
  await expect(
    box.getByRole('button', { name: 'Remove sample notebook' }),
  ).toBeDisabled()
})
