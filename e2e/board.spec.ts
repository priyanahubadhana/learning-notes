import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, sidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const tracker = (page: Page) =>
  main(page).getByRole('region', { name: 'Study tracker' })
const viewButton = (page: Page, name: string) =>
  tracker(page).getByRole('button', { name, exact: true })
/** A board column, by its name (its label also says how many cards). */
const group = (page: Page, name: string) =>
  tracker(page).getByRole('region', { name: new RegExp(`^${name}, \\d+ card`) })
const cards = (page: Page, name: string) =>
  group(page, name).getByRole('listitem')

async function openBoard(page: Page) {
  await sidebar(page)
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Database' }).click()
  await viewButton(page, 'Board').click()
}

/** Adds the Choice column "Exam" (Soon, Done) from the empty Board. */
async function addExamColumn(page: Page) {
  await tracker(page).getByRole('button', { name: '+ Choice column' }).click()
  const dialog = page.getByRole('dialog', { name: 'New Choice column' })
  await dialog.getByRole('textbox', { name: 'Name' }).fill('Exam')
  for (const option of ['Soon', 'Done']) {
    await dialog.getByRole('textbox', { name: 'Add an option' }).fill(option)
    await dialog.getByRole('textbox', { name: 'Add an option' }).press('Enter')
  }
  await dialog.getByRole('button', { name: 'Add column' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await addPage(page, 'Cardiology', 'Murmurs')
})

test('board: group by a Choice column, drag, Move to, new card, Card shows', async ({
  page,
}) => {
  await openBoard(page)
  await expect(tracker(page)).toContainText('A board puts rows in columns')
  await addExamColumn(page)

  // Every lesson starts in "No Exam"; empty groups still show.
  await expect(cards(page, 'No Exam')).toHaveText([/Heart sounds/, /Murmurs/])
  await expect(cards(page, 'Soon')).toHaveCount(0)
  await expect(cards(page, 'Done')).toHaveCount(0)

  // Drag a card to another column (mouse).
  await cards(page, 'No Exam')
    .filter({ hasText: 'Heart sounds' })
    .dragTo(group(page, 'Soon'))
  await expect(cards(page, 'Soon')).toHaveText([/Heart sounds/])

  // "Move to" (touch and keyboard).
  await page.getByRole('button', { name: 'Options for “Murmurs”' }).click()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(cards(page, 'Done')).toHaveText([/Murmurs/])
  // "No Exam" is hidden once it is empty.
  await expect(group(page, 'No Exam')).toHaveCount(0)

  // The Table shows the same values.
  await viewButton(page, 'Table').click()
  await expect(
    tracker(page)
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: 'Murmurs' }) }),
  ).toContainText('Done')
  await viewButton(page, 'Board').click()

  // A new card goes into the column it was added in.
  await page.getByRole('button', { name: '+ New lesson in Soon' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Valves')
  await page.getByRole('textbox', { name: 'Title' }).press('Enter')
  await expect(cards(page, 'Soon')).toHaveText([/Heart sounds/, /Valves/])
  // Lessons are notes: it shows in the Notes tree too.
  await expect(
    sidebar(page).getByRole('button', { name: 'Valves', exact: true }),
  ).toBeVisible()

  // Card shows: pick which values cards show.
  await viewButton(page, 'Table').click()
  await tracker(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: 'Murmurs' }) })
    .getByRole('group', { name: /^Confidence/ })
    .getByRole('button', { name: '4 stars' })
    .click()
  await viewButton(page, 'Board').click()
  // By default cards show the first three columns (here: auto columns).
  await expect(cards(page, 'Done')).not.toContainText('★')
  await tracker(page).getByRole('button', { name: 'Card shows' }).click()
  await page.getByRole('button', { name: 'Confidence' }).click()
  await page.keyboard.press('Escape')
  await expect(cards(page, 'Done')).toContainText('★★★★')

  // Clicking a card opens its page.
  await cards(page, 'Done')
    .getByRole('button', { name: 'Murmurs', exact: true })
    .click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Murmurs',
  )

  // Saved: same board after a reload.
  await page.reload()
  await openBoard(page)
  await expect(cards(page, 'Soon')).toHaveText([/Heart sounds/, /Valves/])
  await expect(cards(page, 'Done')).toContainText('★★★★')
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: board ${theme} ${width}×${height}`, async ({ page }) => {
    await addPage(page, 'Cardiology', 'ECG basics')
    await openBoard(page)
    await addExamColumn(page)
    await page.getByRole('button', { name: 'Options for “Murmurs”' }).click()
    await page.getByRole('button', { name: 'Soon', exact: true }).click()
    await page.getByRole('button', { name: 'Options for “ECG basics”' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await sidebar(page)
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    await expect(cards(page, 'Soon')).toHaveCount(1)
    // The page itself never scrolls sideways (the board scrolls inside).
    const overflow = await page.evaluate(
      () =>
        document.querySelector('main')!.scrollWidth -
        document.querySelector('main')!.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/board-${theme}-${width}x${height}.png`,
      fullPage: true,
    })
  })
}
