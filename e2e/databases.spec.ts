import { expect, test, type Page } from '@playwright/test'
import { createNotebook, makeCard, sidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

test('All databases: new Drug list, rows open as pages with properties', async ({
  page,
}) => {
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await expect(
    main(page).getByRole('heading', { name: 'Databases' }),
  ).toBeVisible()
  await expect(main(page)).toContainText('No databases yet')

  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Drug list/ }).click()
  await expect(main(page).getByRole('textbox', { name: 'Rename' })).toHaveValue(
    'Drug list',
  )

  // Add a row, name it, open it as a page.
  await main(page).getByRole('button', { name: 'Table' }).click()
  await main(page).getByRole('button', { name: '+ New row' }).click()
  await page.getByRole('textbox', { name: /^Drug/ }).fill('Amlodipine')
  await page.getByRole('textbox', { name: /^Drug/ }).press('Enter')
  await main(page)
    .getByRole('row')
    .filter({ hasText: 'Amlodipine' })
    .getByRole('button', { name: /^Open/ })
    .click()

  // The row page shows its properties above the notes; edit one.
  const props = main(page).getByRole('region', { name: 'Properties' })
  await expect(props).toContainText('Class')
  await expect(
    main(page).getByRole('navigation', { name: 'Breadcrumb' }),
  ).toContainText('Drug list')
  await props.getByRole('button', { name: /^Class/ }).click()
  await props.getByRole('textbox').fill('Calcium blocker')
  await props.getByRole('textbox').press('Enter')
  await expect(props).toContainText('Calcium blocker')

  // Back in the hub it is listed with its row.
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await expect(main(page)).toContainText('Drug list')
  await expect(main(page)).toContainText('1 row')
})

test('All cards lists every notebook’s cards and reviews them', async ({
  page,
}) => {
  await makeCard(page, 'Which valves close in S1?', 1)
  await sidebar(page).getByRole('button', { name: 'All cards' }).click()
  await expect(
    main(page).getByRole('heading', { name: 'All cards' }),
  ).toBeVisible()
  await expect(main(page)).toContainText('Which valves close in S1?')
  await expect(main(page)).toContainText('from all your notebooks')
  await main(page)
    .getByRole('button', { name: /^Review 1 due/ })
    .click()
  await expect(
    page.getByText('Which valves close in S1?').first(),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /Show answer/ })).toBeVisible()
})

test('a lesson page shows its tracker properties and Back to auto', async ({
  page,
}) => {
  // The tracker exists once the Database tab has been opened.
  await sidebar(page)
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Database' }).click()
  await sidebar(page)
    .getByRole('button', { name: 'Heart sounds', exact: true })
    .click()

  const props = main(page).getByRole('region', { name: 'Properties' })
  await expect(props).toContainText('Not started')
  await props.getByRole('button', { name: /^Edit Status/ }).click()
  await page.getByRole('button', { name: 'Mastered' }).click()
  await expect(props).toContainText('Mastered')
  await props.getByRole('button', { name: 'Back to auto' }).click()
  await expect(props).toContainText('Not started')
  await expect(props.getByRole('button', { name: 'Back to auto' })).toHaveCount(
    0,
  )
})

test('/database shows a database inside a note with its own view', async ({
  page,
}) => {
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/database')
  await page.keyboard.press('Enter')
  await page
    .getByRole('dialog', { name: 'Add a database' })
    .getByRole('button', { name: 'New: Drug list' })
    .click()

  const block = page.getByRole('region', { name: 'Drug list' })
  await expect(block).toBeVisible()
  // Its own view: switch it to a Board without touching the database.
  await block.getByRole('button', { name: /Board/ }).click()
  await expect(
    block.getByRole('button', { name: '+ Choice column' }),
  ).toBeVisible()
  await block.getByRole('button', { name: /Table/ }).click()
  await block.getByRole('button', { name: '+ New row' }).click()
  await page.getByRole('textbox', { name: /^Drug/ }).fill('Atenolol')
  await page.getByRole('textbox', { name: /^Drug/ }).press('Enter')
  await expect(
    block.getByRole('row').filter({ hasText: 'Atenolol' }),
  ).toHaveCount(1)

  // Open on its own screen.
  await block.getByRole('button', { name: 'Open ↗' }).first().click()
  await expect(main(page).getByRole('textbox', { name: 'Rename' })).toHaveValue(
    'Drug list',
  )
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: databases ${theme} ${width}×${height}`, async ({
    page,
  }) => {
    await makeCard(page, 'Which valves close in S1?', 1)
    await page.keyboard.press('Enter')
    await page.keyboard.type('/database')
    await page.keyboard.press('Enter')
    await page
      .getByRole('dialog', { name: 'Add a database' })
      .getByRole('button', { name: 'New: Books' })
      .click()
    await expect(page.getByRole('region', { name: 'Books' })).toBeVisible()
    await sidebar(page)
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(400)
    await page.screenshot({
      path: `test-results/screens/db-block-${theme}-${width}x${height}.png`,
      fullPage: true,
    })
    await sidebar(page)
      .getByRole('button', { name: 'Databases' })
      .click()
      .catch(() => {})
  })
}

test('database screen: one name, delete in the ⋯ menu, view stays while adding rows, no loops', async ({
  page,
}) => {
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Books/ }).click()
  // The name shows once (the editable title), not again beside the views.
  await expect(main(page).getByRole('heading', { name: 'Books' })).toHaveCount(
    0,
  )
  // An empty database opens on Table and stays there while rows are added.
  await expect(
    main(page).getByRole('button', { name: 'Table', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await main(page).getByRole('button', { name: '+ New row' }).click()
  await page.getByRole('textbox', { name: /^Title/ }).fill('Dune')
  await page.getByRole('textbox', { name: /^Title/ }).press('Enter')
  await expect(
    main(page).getByRole('button', { name: 'Table', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    main(page).getByRole('button', { name: 'Delete database' }),
  ).toHaveCount(0)

  // A database block inside one of its own rows shows a message, not itself.
  await main(page)
    .getByRole('row')
    .filter({ hasText: 'Dune' })
    .getByRole('button', { name: /^Open/ })
    .click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/database')
  await page.keyboard.press('Enter')
  await page
    .getByRole('dialog', { name: 'Add a database' })
    .getByRole('button', { name: 'Books', exact: true })
    .click()
  await expect(main(page)).toContainText('shown inside one of its own rows')
  // No stray text-toolbar ("Blank") pops up over the editor.
  await expect(page.getByRole('button', { name: 'Blank' })).toHaveCount(0)

  // Delete from the ⋯ menu.
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await main(page)
    .getByRole('button', { name: /^Books/ })
    .click()
  await main(page).getByRole('button', { name: 'Database options' }).click()
  await page.getByRole('menuitem', { name: 'Delete database' }).click()
  await expect(main(page)).toContainText('No databases yet')
})

test('+ View adds a Calendar and a Gallery; views can be renamed and deleted', async ({
  page,
}) => {
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Books/ }).click()
  const view = (name: string) =>
    main(page).getByRole('button', { name, exact: true })

  // Calendar: the Finished date column places rows; "+" on a day adds one.
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  await expect(view('Calendar')).toHaveAttribute('aria-pressed', 'true')
  const today = main(page)
    .locator('[data-calendar-day]')
    .filter({ hasText: /^\d/ })
    .first()
  await expect(today).toBeVisible()
  const day = main(page).locator('[data-calendar-day]').nth(10)
  await day.hover()
  await day.getByRole('button', { name: /^Add a row on/ }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Dune')
  await page.getByRole('textbox', { name: 'Title' }).press('Enter')
  await sidebar(page).getByRole('button', { name: 'Databases' }).click()
  await main(page)
    .getByRole('button', { name: /^Books/ })
    .click()
  await view('Calendar').click()
  await expect(
    main(page)
      .getByRole('button', { name: /Dune|Untitled/ })
      .first(),
  ).toBeVisible()
  await main(page).getByRole('button', { name: 'Week', exact: true }).click()
  await expect(main(page).locator('[data-calendar-day]')).toHaveCount(7)

  // Gallery.
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Gallery' })
    .click()
  await expect(main(page).getByText('1 tile')).toBeVisible()

  // Rename, then delete with Undo.
  await main(page).getByRole('button', { name: 'View options' }).click()
  await page.getByRole('button', { name: 'Rename this view…' }).click()
  await page.getByRole('textbox', { name: 'View name' }).fill('Covers')
  await page.getByRole('textbox', { name: 'View name' }).press('Enter')
  await expect(view('Covers')).toBeVisible()
  await main(page).getByRole('button', { name: 'View options' }).click()
  await page.getByRole('button', { name: 'Delete this view' }).click()
  await expect(view('Covers')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(view('Covers')).toBeVisible()
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: calendar and gallery ${theme} ${width}×${height}`, async ({
    page,
  }) => {
    await sidebar(page).getByRole('button', { name: 'Databases' }).click()
    await main(page).getByRole('button', { name: '+ New database' }).click()
    await page.getByRole('menuitem', { name: /^Books/ }).click()
    await sidebar(page)
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    for (const type of ['Calendar', 'Gallery']) {
      await main(page).getByRole('button', { name: '+ View' }).click()
      await page
        .getByRole('dialog', { name: 'Add a view' })
        .getByRole('button', { name: type })
        .click()
      await page.waitForTimeout(400)
      await page.screenshot({
        path: `test-results/screens/${type.toLowerCase()}-${theme}-${width}x${height}.png`,
        fullPage: true,
      })
    }
    const overflow = await page.evaluate(
      () =>
        document.querySelector('main')!.scrollWidth -
        document.querySelector('main')!.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
