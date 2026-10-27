import { expect, test, type Locator, type Page } from '@playwright/test'
import { addPage, createNotebook, makeCard, openSidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const tracker = (page: Page) =>
  main(page).getByRole('region', { name: 'Study tracker' })
const viewButton = (page: Page, name: string) =>
  tracker(page).getByRole('button', { name, exact: true })
const lessonRow = (page: Page, lesson: string): Locator =>
  tracker(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: lesson }) })
const column = (page: Page, name: string) =>
  tracker(page)
    .getByRole('button', { name: new RegExp(name) })
    .first()
const group = (page: Page, name: string) =>
  tracker(page).getByRole('region', { name: new RegExp(`^${name}, \\d+ card`) })
const chart = (page: Page, name: string) =>
  tracker(page).getByRole('region', { name, exact: true })
const statusButton = (page: Page, lesson: string) =>
  lessonRow(page, lesson).getByRole('button', { name: /^Edit Status of/ })

async function openTracker(page: Page) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Database' }).click()
}

/** Reviews both cards: the first rated Good, the second Again. */
async function review(page: Page) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: /^Review(?! this)/ })
    .click()
  const screen = page.locator(
    'main section:not([aria-labelledby^="linked-from"])',
  )
  await screen.getByRole('button', { name: 'Show answer' }).click()
  await page.keyboard.press('3') // Good
  await screen.getByRole('button', { name: 'Show answer' }).click()
  await page.keyboard.press('1') // Again
  await expect(screen).toContainText('Done for now')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

/** Two cards in "Heart sounds" and a second lesson, "Murmurs". */
async function seed(page: Page) {
  await makeCard(page, 'Which valves close in S1?', 1)
  await page.keyboard.press('Enter')
  await makeCard(page, 'What causes S2?', 2)
  await addPage(page, 'Cardiology', 'Murmurs')
}

test('tracker fills in from reviews; Status can be set (📌) and handed back to Auto', async ({
  page,
}) => {
  await seed(page)
  await openTracker(page)
  await viewButton(page, 'Table').click()

  // Nothing reviewed yet: Not started, 2 new cards, nothing correct.
  const heart = lessonRow(page, 'Heart sounds')
  await expect(heart).toContainText('Not started')
  await expect(heart).toContainText('2 new')
  await expect(lessonRow(page, 'Murmurs')).not.toContainText('new')

  await review(page)
  await openTracker(page)
  await viewButton(page, 'Table').click()

  // One Good, one Again: 50% correct → Learning; both cards are Learning.
  await expect(heart).toContainText('Learning')
  await expect(heart).toContainText('50%')
  await expect(heart).toContainText('All done')
  await expect(heart).toContainText('2 Learning')
  await expect(
    heart.locator('time, [data-last-revised]').or(heart),
  ).toContainText(/\d{4}/)

  // Set the Status by hand: 📌 appears; the menu says what Auto would be.
  await statusButton(page, 'Heart sounds').click()
  const menu = page.getByRole('dialog', { name: 'Status' })
  await expect(
    menu.getByRole('button', { name: /Auto \(now: Learning\)/ }),
  ).toHaveAttribute('aria-current', 'true')
  await menu.getByRole('button', { name: /Mastered/ }).click()
  await expect(heart).toContainText('Mastered')
  await expect(heart.getByRole('img', { name: 'Set by you' })).toBeVisible()

  // Back to Auto.
  await statusButton(page, 'Heart sounds').click()
  await page.getByRole('button', { name: /Auto \(now: Learning\)/ }).click()
  await expect(heart).toContainText('Learning')
  await expect(heart.getByRole('img', { name: 'Set by you' })).toHaveCount(0)

  // Status filters like a Choice column.
  await column(page, 'Status').click()
  await expect(page.getByRole('dialog', { name: /Status/ })).toBeVisible()
})

test('Board groups lessons by Status; dropping on the Auto column hands it back', async ({
  page,
}) => {
  await seed(page)
  await review(page)
  await openTracker(page)
  await viewButton(page, 'Board').click()
  await expect(
    tracker(page).getByRole('button', { name: 'Grouped by Status' }),
  ).toBeVisible()
  await expect(
    group(page, 'Learning').getByRole('listitem').filter({ hasText: 'Heart' }),
  ).toHaveCount(1)
  await expect(
    group(page, 'Not started')
      .getByRole('listitem')
      .filter({ hasText: 'Murmurs' }),
  ).toHaveCount(1)
  // The fixed Status options cannot be edited.
  await expect(
    tracker(page).getByRole('button', { name: 'Add option' }),
  ).toHaveCount(0)

  // "Move to" Mastered sets it (📌); "Move to" Learning (its Auto) hands it back.
  await page.getByRole('button', { name: 'Options for “Heart sounds”' }).click()
  await page.getByRole('button', { name: 'Mastered', exact: true }).click()
  await expect(
    group(page, 'Mastered').getByRole('listitem').filter({ hasText: 'Heart' }),
  ).toHaveCount(1)
  await viewButton(page, 'Table').click()
  await expect(
    lessonRow(page, 'Heart sounds').getByRole('img', { name: 'Set by you' }),
  ).toBeVisible()
  await viewButton(page, 'Board').click()
  await page.getByRole('button', { name: 'Options for “Heart sounds”' }).click()
  await page.getByRole('button', { name: 'Learning', exact: true }).click()
  await viewButton(page, 'Table').click()
  await expect(
    lessonRow(page, 'Heart sounds').getByRole('img', { name: 'Set by you' }),
  ).toHaveCount(0)
  await expect(lessonRow(page, 'Heart sounds')).toContainText('Learning')
})

test('Dashboard: lessons by status and the review history; charts say lessons', async ({
  page,
}) => {
  await seed(page)
  await review(page)
  await openTracker(page)
  await viewButton(page, 'Dashboard').click()
  await expect(chart(page, 'Study streak')).toContainText('🔥 1 day')
  await expect(chart(page, 'Study streak')).toContainText('Best: 1 day')
  await expect(chart(page, 'Answers right per week')).toContainText('50%')
  await expect(chart(page, 'Cards answered per day')).toBeVisible()
  await expect(chart(page, 'Lessons')).toContainText('2')
  // Charts that measure a column say where their numbers come from.
  await expect(tracker(page)).toContainText('from 1 lesson')
  await expect(tracker(page)).not.toContainText('rows')
  // History charts have no "Edit chart" (their settings are fixed).
  await page
    .getByRole('button', { name: '“Study streak” chart options' })
    .click()
  await expect(page.getByRole('button', { name: 'Edit chart' })).toHaveCount(0)
})

test('Show help: tips on hover, help lines, and all gone when switched off', async ({
  page,
}) => {
  await openTracker(page)
  await viewButton(page, 'Table').click()

  // Help lines under the table, marked for review.
  await expect(page.locator('[data-help-line="tracker.table"]')).toBeVisible()
  await expect(page.locator('[data-help-line="tracker.levels"]')).toBeVisible()

  // A hover tip: plain meaning plus an example.
  await column(page, 'Cards due').hover()
  const tip = page.getByRole('tooltip')
  await expect(tip).toContainText('Cards ready to review now')
  await expect(tip).toContainText('Example: 5 due · 20 new.')
  await page.keyboard.press('Escape')
  await expect(tip).toHaveCount(0)

  // Off: no tips and no help lines.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Settings' })
    .click()
  await main(page)
    .getByRole('group', { name: 'Show help' })
    .getByRole('button', { name: 'Off' })
    .click()
  await openTracker(page)
  await viewButton(page, 'Table').click()
  await expect(page.locator('[data-help-line]')).toHaveCount(0)
  await column(page, 'Cards due').hover()
  await page.waitForTimeout(700)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(page.locator('[data-tip]')).toHaveCount(0)
})

test.describe('touch: tap ⓘ opens the tip', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true })

  test('the ⓘ shows the tip on a touch screen', async ({ page }) => {
    await addPage(page, 'Cardiology', 'Murmurs')
    await openTracker(page)
    await viewButton(page, 'Table').click()
    await main(page)
      .getByRole('button', { name: 'What is this?' })
      .first()
      .tap()
    await expect(page.getByRole('tooltip')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toHaveCount(0)
  })
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: Study tracker ${theme} ${width}×${height}`, async ({
    page,
  }) => {
    await seed(page)
    await review(page)
    await openTracker(page)
    await (
      await openSidebar(page)
    )
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    for (const view of ['Table', 'Board', 'Dashboard']) {
      await viewButton(page, view).click()
      await page.waitForTimeout(400) // let the theme fade finish
      await page.screenshot({
        path: `test-results/screens/tracker-${view.toLowerCase()}-${theme}-${width}x${height}.png`,
        fullPage: true,
      })
    }
    // The page itself never scrolls sideways.
    const overflow = await page.evaluate(
      () =>
        document.querySelector('main')!.scrollWidth -
        document.querySelector('main')!.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

test('check-in fixes: addable history charts, short titles, pins, No cards', async ({
  page,
}) => {
  await seed(page)
  await review(page)
  await openTracker(page)

  // Table: a lesson without cards says so.
  await viewButton(page, 'Table').click()
  await expect(lessonRow(page, 'Murmurs')).toContainText('No cards')

  // Rate one lesson: the average counts only lessons with a rating.
  await lessonRow(page, 'Heart sounds')
    .getByRole('group', { name: /^Confidence/ })
    .getByRole('button', { name: '4 stars' })
    .click()
  await viewButton(page, 'Dashboard').click()
  await expect(chart(page, 'Avg. Confidence')).toContainText('4 ★')
  await expect(chart(page, 'Avg. Confidence')).toContainText('from 1 lesson')

  // Review-history charts can be added again after they were removed.
  await page
    .getByRole('button', { name: '“Study streak” chart options' })
    .click()
  await page.getByRole('button', { name: 'Delete chart' }).click()
  await expect(chart(page, 'Study streak')).toHaveCount(0)
  await tracker(page).getByRole('button', { name: '+ Add chart' }).click()
  await page
    .getByRole('dialog', { name: 'New chart' })
    .getByRole('button', { name: 'Study streak' })
    .click()
  await expect(chart(page, 'Study streak')).toContainText('🔥')
  await expect(chart(page, 'Answers right per week')).toBeVisible()

  // "Total" is not offered for a percentage column.
  await tracker(page).getByRole('button', { name: '+ Add chart' }).click()
  const options = page
    .getByRole('dialog', { name: 'New chart' })
    .getByRole('combobox', { name: 'Show' })
    .locator('option')
  await expect(options.filter({ hasText: 'Avg. % correct' })).toHaveCount(1)
  await expect(options.filter({ hasText: 'Total % correct' })).toHaveCount(0)
  await expect(options.filter({ hasText: 'Total Cards due' })).toHaveCount(1)
  await page.keyboard.press('Escape')

  // A status set by hand shows its 📌 on the Board card too.
  await viewButton(page, 'Board').click()
  await page.getByRole('button', { name: 'Options for “Heart sounds”' }).click()
  await page.getByRole('button', { name: 'Mastered', exact: true }).click()
  await expect(
    group(page, 'Mastered').getByRole('img', { name: 'Set by you' }),
  ).toBeVisible()
})
