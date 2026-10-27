import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, sidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const tracker = (page: Page) =>
  main(page).getByRole('region', { name: 'Study tracker' })
const header = (page: Page, name: string) =>
  tracker(page)
    .getByRole('columnheader')
    .getByRole('button', { name, exact: true })
const lessonRow = (page: Page, lesson: string) =>
  tracker(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: lesson }) })

/** Opens the notebook's Study tracker (Database tab). */
async function openTracker(page: Page) {
  await sidebar(page)
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Database' }).click()
  await expect(tracker(page).getByRole('table')).toBeVisible()
}

/** "+ Column" → a type (under "More types" if needed) → the dialog. */
async function addColumn(page: Page, type: string, more = false) {
  await tracker(page).getByRole('button', { name: '+ Column' }).click()
  const menu = page.getByRole('dialog', { name: 'Column type' })
  if (more) await menu.getByRole('button', { name: /^More types/ }).click()
  await menu.getByRole('button', { name: new RegExp(`^${type}( |$)`) }).click()
  return page.getByRole('dialog', { name: `New ${type} column` })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

test('tracker: new lesson, rename, stars, sort, filter, hide', async ({
  page,
}) => {
  await addPage(page, 'Cardiology', 'Murmurs')
  await openTracker(page)

  // + New lesson makes a page in the notebook; its name is typed in place.
  await tracker(page).getByRole('button', { name: '+ New lesson' }).click()
  await expect(
    tracker(page).getByRole('textbox', { name: 'Lesson' }),
  ).toBeFocused()
  await page.keyboard.type('ECG basics')
  await page.keyboard.press('Enter')
  await expect(tracker(page).getByRole('rowheader')).toHaveText([
    /^Heart sounds/,
    /^Murmurs/,
    /^ECG basics/,
  ])
  await expect(
    sidebar(page).getByRole('button', { name: 'ECG basics', exact: true }),
  ).toBeVisible()

  // Rename in place: Esc keeps the old name, Enter saves.
  await tracker(page)
    .getByRole('button', { name: 'Edit Lesson of “Murmurs”' })
    .click()
  await page.keyboard.type('Nope')
  await page.keyboard.press('Escape')
  await expect(lessonRow(page, 'Murmurs')).toBeVisible()

  // Confidence: tap a star; tap it again to clear.
  const stars = (lesson: string) =>
    lessonRow(page, lesson).getByRole('group', { name: /^Confidence/ })
  await stars('Murmurs').getByRole('button', { name: '3 stars' }).click()
  await stars('ECG basics').getByRole('button', { name: '1 star' }).click()
  await expect(
    stars('Murmurs').getByRole('button', { name: '3 stars' }),
  ).toHaveAttribute('aria-pressed', 'true')

  // Rating filter: pick stars, see how many rows match before Apply.
  await header(page, 'Confidence').click()
  const rating = page.getByRole('dialog', {
    name: 'Confidence column options',
  })
  await expect(rating).toContainText('Show only rows where Confidence…')
  await expect(rating.getByRole('combobox', { name: 'Filter' })).toHaveValue(
    'gte',
  )
  await rating.getByRole('button', { name: '3 stars' }).click()
  await expect(rating).toContainText('1 of 3 rows match')
  await rating.getByRole('combobox', { name: 'Filter' }).selectOption('isEmpty')
  await expect(rating.getByRole('option', { selected: true })).toHaveText(
    'has no rating',
  )
  await expect(rating).toContainText('1 of 3 rows match')
  await rating.getByRole('combobox', { name: 'Filter' }).selectOption('gte')
  await rating.getByRole('button', { name: '3 stars' }).click()
  await rating.getByRole('button', { name: 'Apply' }).click()
  await expect(tracker(page)).toContainText('Confidence at least ★★★☆☆')
  await expect(tracker(page).getByRole('rowheader')).toHaveText([/^Murmurs/])
  await header(page, 'Confidence').click()
  await page.getByRole('button', { name: 'Clear filter' }).click()
  await expect(tracker(page).getByRole('rowheader')).toHaveCount(3)

  // Sort from the column menu; the chip shows it and removes it.
  await header(page, 'Confidence').click()
  await page.getByRole('button', { name: 'High → low' }).click()
  await expect(tracker(page).getByRole('rowheader')).toHaveText([
    /^Murmurs/,
    /^ECG basics/,
    /^Heart sounds/,
  ])
  await expect(tracker(page)).toContainText('Sorted: Confidence High → low')

  // Filter: Lesson contains "ecg".
  await header(page, 'Lesson').click()
  const menu = page.getByRole('dialog', { name: 'Lesson column options' })
  await menu.getByRole('textbox', { name: 'Value' }).fill('ecg')
  await menu.getByRole('button', { name: 'Apply' }).click()
  await expect(tracker(page).getByRole('rowheader')).toHaveText([/^ECG basics/])
  await expect(tracker(page)).toContainText('1 of 3 rows')
  await tracker(page)
    .getByRole('button', { name: 'Remove filter: Lesson contains “ecg”' })
    .click()
  await expect(tracker(page).getByRole('rowheader')).toHaveCount(3)
  await tracker(page).getByRole('button', { name: 'Clear all' }).click()
  await expect(tracker(page)).not.toContainText('Sorted:')

  // Auto columns explain themselves and cannot be edited.
  await header(page, 'Status auto').click()
  const status = page.getByRole('dialog', { name: 'Status column options' })
  await expect(status).toContainText('Not started = no reviews yet')
  await expect(status.getByRole('button', { name: 'Edit column' })).toHaveCount(
    0,
  )

  // Hide a column, then show it again from the chip.
  await status.getByRole('button', { name: 'Hide column' }).click()
  await expect(header(page, 'Status auto')).toHaveCount(0)
  await tracker(page).getByRole('button', { name: '1 hidden column' }).click()
  await page.getByRole('button', { name: 'Show “Status”' }).click()
  await expect(header(page, 'Status auto')).toBeVisible()

  // The view remembers its settings.
  await header(page, 'Lesson').click()
  await page.getByRole('button', { name: 'Z → A' }).click()
  await expect(tracker(page)).toContainText('Sorted: Lesson Z → A')
  await page.reload()
  await expect(tracker(page).getByRole('rowheader').first()).toContainText(
    'Murmurs',
  )
})

test('columns: number, choice, checkbox, formula; edit and delete', async ({
  page,
}) => {
  await openTracker(page)

  // A % number column; 75 typed shows as 75%.
  const number = await addColumn(page, 'Number')
  await number.getByRole('textbox', { name: 'Name' }).fill('Score')
  await number
    .getByRole('combobox', { name: 'Show as' })
    .selectOption('percent')
  await number.getByRole('button', { name: 'Add column' }).click()
  await tracker(page)
    .getByRole('button', { name: 'Edit Score of “Heart sounds”' })
    .click()
  await page.keyboard.type('75')
  await page.keyboard.press('Enter')
  await expect(lessonRow(page, 'Heart sounds')).toContainText('75%')

  // A Choice column: create an option from the picker.
  const choice = await addColumn(page, 'Choice')
  await choice.getByRole('textbox', { name: 'Name' }).fill('Priority')
  await choice.getByRole('textbox', { name: 'Add an option' }).fill('Low')
  await choice.getByRole('textbox', { name: 'Add an option' }).press('Enter')
  await choice.getByRole('button', { name: 'Add column' }).click()
  await tracker(page)
    .getByRole('button', { name: /^Edit Priority of/ })
    .click()
  const picker = page.getByRole('dialog', { name: 'Priority' })
  await picker.getByRole('textbox', { name: 'Find…' }).fill('High')
  await picker.getByRole('button', { name: 'Create “High”' }).click()
  await expect(picker).toHaveCount(0) // one choice: picking closes it
  await expect(lessonRow(page, 'Heart sounds')).toContainText('High')

  // A checkbox ticks in place.
  const checkbox = await addColumn(page, 'Checkbox')
  await checkbox.getByRole('textbox', { name: 'Name' }).fill('Done')
  await checkbox.getByRole('button', { name: 'Add column' }).click()
  const done = tracker(page).getByRole('checkbox', {
    name: 'Done of “Heart sounds”',
  })
  await done.check()
  await expect(done).toBeChecked()

  // A formula, built as a sentence, with a live preview.
  const formula = await addColumn(page, 'Formula', true)
  await formula.getByRole('textbox', { name: 'Name' }).fill('Advice')
  await expect(
    formula.getByRole('combobox', { name: 'Column to check' }),
  ).toHaveValue('Score')
  await expect(
    formula.getByRole('combobox', { name: 'Condition' }),
  ).toHaveValue('lt')
  await expect(formula).toContainText('Preview (Heart sounds): OK') // 75% isn't below 75
  await formula.getByRole('textbox', { name: 'Value' }).fill('80')
  await expect(formula).toContainText('Preview (Heart sounds): Redo')
  await formula.getByRole('textbox', { name: 'Value' }).fill('')
  await expect(
    formula.getByRole('button', { name: 'Add column' }),
  ).toBeDisabled()
  await formula.getByRole('textbox', { name: 'Value' }).fill('80')
  // Advanced: the same formula, typed, with what it means.
  await formula
    .getByRole('button', { name: 'Advanced: write a custom formula' })
    .click()
  const typed = formula.getByRole('textbox', { name: 'Formula' })
  await expect(typed).toHaveValue('IF([Score] < 0.8, "Redo", "OK")')
  await expect(formula).toContainText(
    'Means: if Score is below 80%, write Redo, otherwise OK',
  )
  await typed.fill('[Nope]')
  await expect(formula).toContainText('No column called [Nope]')
  await formula.getByRole('button', { name: 'Score times 1.5' }).click()
  await expect(typed).toHaveValue('[Score] * 1.5')
  await expect(formula).toContainText('Means: Score times 1.5')
  await typed.fill('IF([Score] < 0.8, "Redo", "OK")')
  await formula
    .getByRole('button', { name: 'Back to the simple sentence' })
    .click()
  await expect(formula.getByRole('textbox', { name: 'Value' })).toHaveValue(
    '80',
  )
  await formula.getByRole('button', { name: 'Add column' }).click()
  await expect(lessonRow(page, 'Heart sounds')).toContainText('Redo')

  // Renaming a column keeps formulas working.
  await header(page, 'Score').click()
  await page.getByRole('button', { name: 'Edit column' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit column' })
  await edit.getByRole('textbox', { name: 'Name' }).fill('Mark')
  await edit.getByRole('button', { name: 'Save' }).click()
  await expect(header(page, 'Mark')).toBeVisible()
  await expect(lessonRow(page, 'Heart sounds')).toContainText('Redo')
  await header(page, 'Advice').click()
  await page.getByRole('button', { name: 'Edit column' }).click()
  const advice = page.getByRole('dialog', { name: 'Edit column' })
  await expect(
    advice.getByRole('combobox', { name: 'Column to check' }),
  ).toHaveValue('Mark')
  await page.keyboard.press('Escape')

  // Delete, then Undo.
  await header(page, 'Done').click()
  await page.getByRole('button', { name: 'Edit column' }).click()
  await page.getByRole('button', { name: 'Delete column' }).click()
  await expect(header(page, 'Done')).toHaveCount(0)
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(header(page, 'Done')).toBeVisible()
})

test('relation and rollup columns', async ({ page }) => {
  await addPage(page, 'Cardiology', 'ECG basics')
  await openTracker(page)

  const relation = await addColumn(page, 'Relation', true)
  await relation.getByRole('textbox', { name: 'Name' }).fill('Needs')
  await relation
    .getByRole('checkbox', { name: 'Also show the link in that database' })
    .uncheck()
  await relation.getByRole('button', { name: 'Add column' }).click()

  await lessonRow(page, 'ECG basics')
    .getByRole('button', { name: /^Edit Needs of/ })
    .click()
  const picker = page.getByRole('dialog', { name: 'Needs' })
  await picker.getByRole('button', { name: 'Heart sounds' }).click()
  await expect(
    picker.getByRole('button', { name: 'Heart sounds' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(lessonRow(page, 'ECG basics')).toContainText('Heart sounds')

  const rollup = await addColumn(page, 'Rollup', true)
  await rollup.getByRole('textbox', { name: 'Name' }).fill('How many')
  await expect(rollup.getByRole('combobox', { name: 'Through' })).toHaveValue(
    /.+/,
  )
  await rollup.getByRole('button', { name: 'Add column' }).click()
  await expect(
    lessonRow(page, 'ECG basics').getByRole('cell').nth(-2),
  ).toHaveText('1')
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: ${theme} ${width}×${height}`, async ({ page }) => {
    await addPage(page, 'Cardiology', 'ECG basics')
    await sidebar(page)
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    await openTracker(page)
    await lessonRow(page, 'ECG basics')
      .getByRole('button', { name: '4 stars' })
      .click()
    await header(page, 'Confidence').click()
    await page.getByRole('button', { name: 'High → low' }).click()
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/table-${theme}-${width}x${height}.png`,
    })
    await header(page, 'Confidence').click()
    const menu = page.getByRole('dialog', { name: 'Confidence column options' })
    await expect(menu).toBeVisible()
    // The menu fits on screen, also on a phone.
    const box = await menu.boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    await page.screenshot({
      path: `test-results/screens/table-menu-${theme}-${width}x${height}.png`,
    })
    await page.keyboard.press('Escape')
    const formula = await addColumn(page, 'Formula', true)
    await expect(
      formula.getByRole('combobox', { name: 'Column to check' }),
    ).toHaveValue('Confidence')
    const dialogBox = await formula.boundingBox()
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(width)
    await page.screenshot({
      path: `test-results/screens/table-formula-${theme}-${width}x${height}.png`,
    })
  })
}
