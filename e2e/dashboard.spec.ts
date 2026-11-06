import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, sidebar, setTheme } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const tracker = (page: Page) =>
  main(page).getByRole('region', { name: 'Study tracker' })
const viewButton = (page: Page, name: string) =>
  tracker(page).getByRole('button', { name, exact: true })
const chart = (page: Page, name: string) =>
  tracker(page).getByRole('region', { name, exact: true })

async function openTracker(page: Page) {
  await sidebar(page)
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Database' }).click()
}

/** Gives lessons Confidence stars in the Table view. */
async function rate(page: Page, ratings: Record<string, number>) {
  await viewButton(page, 'Table').click()
  for (const [lesson, stars] of Object.entries(ratings)) {
    await tracker(page)
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: lesson }) })
      .getByRole('group', { name: /^Confidence/ })
      .getByRole('button', { name: `${stars} stars` })
      .click()
  }
  await viewButton(page, 'Dashboard').click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await addPage(page, 'Cardiology', 'Murmurs')
})

test('dashboard: starter charts, add, edit, move, table, delete + undo', async ({
  page,
}) => {
  await openTracker(page)
  // With lessons in it, the tracker opens on its Dashboard.
  await expect(viewButton(page, 'Dashboard')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(chart(page, 'Lessons')).toContainText('2')

  // Charts follow the data live.
  await rate(page, { 'Heart sounds': 3, Murmurs: 5 })
  await expect(chart(page, 'Avg. Confidence')).toContainText('4 ★')

  // Add a bar chart: one bar per lesson, with a live preview.
  await tracker(page).getByRole('button', { name: '+ Add chart' }).click()
  const dialog = page.getByRole('dialog', { name: 'New chart' })
  await dialog.getByRole('button', { name: /^Bars/ }).click()
  await dialog
    .getByRole('combobox', { name: 'Group by' })
    .selectOption({ label: 'Lesson (one bar per row)' })
  await dialog
    .getByRole('combobox', { name: 'Show' })
    .selectOption({ label: 'Total Confidence' })
  const preview = dialog.getByRole('region', { name: 'Preview' })
  await expect(preview).toContainText('Confidence by Lesson')
  await expect(preview.getByRole('listitem')).toHaveText([
    /Murmurs.*5 ★/,
    /Heart sounds.*3 ★/,
  ])
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Ratings')
  await dialog.getByRole('button', { name: 'Add chart' }).click()
  await expect(chart(page, 'Ratings')).toContainText('Murmurs')

  // Only rows where …: a filter on the chart.
  const menuOf = (name: string) =>
    chart(page, name).getByRole('button', { name: `“${name}” chart options` })
  await menuOf('Ratings').click()
  await page.getByRole('button', { name: 'Edit chart' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit chart' })
  await edit
    .getByRole('combobox', { name: 'Only rows where' })
    .first()
    .selectOption({ label: 'Confidence' })
  await edit.getByRole('button', { name: 'Save' }).click()
  await expect(chart(page, 'Ratings').getByRole('listitem')).toHaveCount(2)

  // Move it first, show it as a table, then delete it and undo.
  const titles = () =>
    tracker(page)
      .getByRole('region')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  // The menu stays open, so a chart can be moved several places.
  await menuOf('Ratings').click()
  const place = async () => (await titles()).indexOf('Ratings')
  for (let at = await place(); at > 0; at--) {
    await page.getByRole('button', { name: 'Move earlier' }).click()
    await expect.poll(place).toBe(at - 1)
  }
  await expect(page.getByRole('button', { name: 'Move earlier' })).toHaveCount(
    0,
  )
  expect((await titles())[0]).toBe('Ratings')
  await page.getByRole('button', { name: 'Show as table' }).click()
  await expect(chart(page, 'Ratings').getByRole('table')).toContainText(
    'Heart sounds',
  )
  await menuOf('Ratings').click()
  await page.getByRole('button', { name: 'Delete chart' }).click()
  await expect(chart(page, 'Ratings')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(chart(page, 'Ratings')).toBeVisible()

  // Saved: still there after a reload.
  await page.reload()
  await openTracker(page)
  await expect.poll(async () => (await titles())[0]).toBe('Ratings')
})

test('dashboard: choose the view a database opens on', async ({ page }) => {
  await openTracker(page)
  await tracker(page).getByRole('button', { name: 'View options' }).click()
  await page.getByRole('button', { name: 'Always open on “Table”' }).click()
  await tracker(page).getByRole('button', { name: 'View options' }).click()
  await expect(
    page.getByRole('button', { name: 'Always open on “Table”' }),
  ).toHaveAttribute('aria-current', 'true')
  await page.reload()
  await openTracker(page)
  await expect(viewButton(page, 'Table')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await tracker(page).getByRole('button', { name: 'View options' }).click()
  await page
    .getByRole('button', { name: 'Open on Dashboard once there are rows' })
    .click()
  await tracker(page).getByRole('button', { name: 'View options' }).click()
  await expect(
    page.getByRole('button', { name: 'Open on Dashboard once there are rows' }),
  ).toHaveAttribute('aria-current', 'true')
  await page.reload()
  await openTracker(page)
  await expect(viewButton(page, 'Dashboard')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: dashboard ${theme} ${width}×${height}`, async ({
    page,
  }) => {
    await addPage(page, 'Cardiology', 'ECG basics')
    await openTracker(page)
    await rate(page, { 'Heart sounds': 3, Murmurs: 5, 'ECG basics': 2 })
    // A Choice column and a Date column give the starter charts data.
    await viewButton(page, 'Table').click()
    await tracker(page).getByRole('button', { name: '+ Column' }).click()
    await page
      .getByRole('dialog', { name: 'Column type' })
      .getByRole('button', { name: /^Date( |$)/ })
      .click()
    await page
      .getByRole('dialog', { name: 'New Date column' })
      .getByRole('button', { name: 'Add column' })
      .click()
    await viewButton(page, 'Dashboard').click()
    await setTheme(page, theme)
    await page.setViewportSize({ width, height })
    await expect(chart(page, 'Lessons')).toBeVisible()
    // Nothing is wider than the screen.
    const overflow = await page.evaluate(
      () =>
        document.querySelector('main')!.scrollWidth -
        document.querySelector('main')!.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/dashboard-${theme}-${width}x${height}.png`,
      fullPage: true,
    })
  })
}
