import { expect, test, type Locator, type Page } from '@playwright/test'
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
const card = (page: Page, column: string, title: string) =>
  cards(page, column).filter({ hasText: title })
const scroller = (page: Page) => page.locator('[data-board-scroller]')

async function openBoard(page: Page) {
  await sidebar(page)
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Database' }).click()
  await viewButton(page, 'Board').click()
}

/** Adds the Choice column "Exam" with these options from the empty Board. */
async function addExamColumn(page: Page, options = ['Soon', 'Done']) {
  await tracker(page).getByRole('button', { name: '+ Choice column' }).click()
  const dialog = page.getByRole('dialog', { name: 'New Choice column' })
  await dialog.getByRole('textbox', { name: 'Name' }).fill('Exam')
  for (const option of options) {
    await dialog.getByRole('textbox', { name: 'Add an option' }).fill(option)
    await dialog.getByRole('textbox', { name: 'Add an option' }).press('Enter')
  }
  await dialog.getByRole('button', { name: 'Add column' }).click()
}

/**
 * Drags a card with the mouse onto `to`: near its top edge (lands before
 * it) or its bottom edge (lands after it / at the end of a column).
 * `whileDragging` runs before the mouse is let go.
 */
async function mouseDrag(
  page: Page,
  from: Locator,
  to: Locator,
  edge: 'top' | 'bottom',
  whileDragging?: () => Promise<void>,
) {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + 24, a.y + a.height / 2)
  await page.mouse.down()
  const y = edge === 'top' ? b.y + 6 : b.y + b.height - 6
  await page.mouse.move(b.x + b.width / 2, y, { steps: 12 })
  await whileDragging?.()
  await page.mouse.up()
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
  // The view tab has its real name (not a text key).
  await expect(viewButton(page, 'Board')).toHaveText(/Board/)
  await expect(tracker(page)).toContainText('A board puts rows in columns')
  await addExamColumn(page)

  // Every lesson starts in "No Exam"; empty groups still show.
  await expect(cards(page, 'No Exam')).toHaveText([/Heart sounds/, /Murmurs/])
  await expect(cards(page, 'Soon')).toHaveCount(0)
  await expect(cards(page, 'Done')).toHaveCount(0)

  // Drag a card to another column: while dragging, the target column is
  // marked and a gap shows where the card will land.
  await mouseDrag(
    page,
    card(page, 'No Exam', 'Heart sounds'),
    group(page, 'Soon'),
    'bottom',
    async () => {
      await expect(page.locator('[data-board-ghost]')).toHaveText(
        /Heart sounds/,
      )
      await expect(group(page, 'Soon')).toHaveClass(/board-target/)
      await expect(group(page, 'Soon').locator('[data-board-gap]')).toHaveCount(
        1,
      )
    },
  )
  await expect(cards(page, 'Soon')).toHaveText([/Heart sounds/])
  await expect(page.locator('[data-board-ghost]')).toHaveCount(0)

  // "Move to" (keyboard).
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

  // Drop onto the top of a card: lands above it (lesson order changes,
  // in the Notes tree too).
  await mouseDrag(
    page,
    card(page, 'Soon', 'Valves'),
    card(page, 'Soon', 'Heart sounds'),
    'top',
  )
  await expect(cards(page, 'Soon')).toHaveText([/Valves/, /Heart sounds/])
  const tree = sidebar(page).getByRole('button', {
    name: /^(Heart sounds|Murmurs|Valves)$/,
  })
  await expect(tree).toHaveText(['Valves', 'Heart sounds', 'Murmurs'])
  // Into another column, between nothing: lands at the place pointed at.
  await mouseDrag(
    page,
    card(page, 'Soon', 'Heart sounds'),
    card(page, 'Done', 'Murmurs'),
    'top',
  )
  await expect(cards(page, 'Done')).toHaveText([/Heart sounds/, /Murmurs/])

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
  await expect(card(page, 'Done', 'Murmurs')).not.toContainText('★')
  await tracker(page).getByRole('button', { name: 'Card shows' }).click()
  await page.getByRole('button', { name: 'Confidence' }).click()
  await page.keyboard.press('Escape')
  await expect(card(page, 'Done', 'Murmurs')).toContainText('★★★★')

  // Clicking a card opens its page.
  await card(page, 'Done', 'Murmurs')
    .getByRole('button', { name: 'Murmurs', exact: true })
    .click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Murmurs',
  )

  // Saved: same board after a reload.
  await page.reload()
  await openBoard(page)
  await expect(cards(page, 'Soon')).toHaveText([/Valves/])
  await expect(cards(page, 'Done')).toHaveText([/Heart sounds/, /Murmurs/])
  await expect(card(page, 'Done', 'Murmurs')).toContainText('★★★★')
})

test('board: a Choice column without options offers "Add options"', async ({
  page,
}) => {
  await openBoard(page)
  await addExamColumn(page, [])
  await expect(tracker(page)).toContainText('“Exam” has no options yet.')
  await tracker(page).getByRole('button', { name: 'Add options' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit column' })
  await dialog.getByRole('textbox', { name: 'Add an option' }).fill('Soon')
  await dialog.getByRole('textbox', { name: 'Add an option' }).press('Enter')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(group(page, 'Soon')).toBeVisible()
  await expect(
    tracker(page).getByRole('button', { name: 'Add options' }),
  ).toHaveCount(0)
  // Also in the "Grouped by" menu, first.
  await tracker(page).getByRole('button', { name: 'Grouped by Exam' }).click()
  await page.getByRole('button', { name: 'Edit “Exam” options' }).click()
  await expect(page.getByRole('dialog', { name: 'Edit column' })).toBeVisible()
})

test.describe('phone (iPhone 16 size, touch)', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true })

  test('board: swipe scrolls sideways; hold a card to drag it', async ({
    page,
  }) => {
    await openBoard(page)
    await addExamColumn(page, ['Soon', 'Later', 'Done'])
    // The view tabs and their ⋯ stay on one line.
    const tableTop = (await viewButton(page, 'Table').boundingBox())!.y
    const moreTop = (await tracker(page)
      .getByRole('button', { name: 'View options' })
      .boundingBox())!.y
    expect(moreTop).toBe(tableTop)
    // Only the board scrolls sideways, never the page around it.
    const wider = await scroller(page).evaluate((el) => {
      const out: string[] = []
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (p.scrollWidth > p.clientWidth + 1) out.push(p.className)
      }
      return out
    })
    expect(wider).toEqual([])

    const cdp = await page.context().newCDPSession(page)
    const touch = async (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      x = 0,
      y = 0,
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      })

    // A quick swipe on a card scrolls the board.
    const box = (await card(page, 'No Exam', 'Murmurs').boundingBox())!
    const y = box.y + box.height / 2
    await touch('touchStart', 300, y)
    for (let x = 290; x >= 60; x -= 20) await touch('touchMove', x, y)
    await touch('touchEnd')
    await expect
      .poll(() => scroller(page).evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(50)
    await scroller(page).evaluate((el) => (el.scrollLeft = 0))

    // Hold, then move: the card is picked up and dropped in "Soon".
    const from = (await card(page, 'No Exam', 'Murmurs').boundingBox())!
    const fx = from.x + 30
    const fy = from.y + from.height / 2
    await touch('touchStart', fx, fy)
    await page.waitForTimeout(400)
    await expect(page.locator('[data-board-ghost]')).toBeVisible()
    // Near the right edge the board scrolls to the next column.
    for (let x = fx; x <= 385; x += 25) await touch('touchMove', x, fy)
    await expect
      .poll(() => scroller(page).evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(100)
    // Then over "Soon", wherever it is now: it is marked as the target.
    await touch('touchMove', 200, fy)
    const soon = (await group(page, 'Soon').boundingBox())!
    await touch('touchMove', soon.x + soon.width / 2, soon.y + 40)
    await expect(group(page, 'Soon')).toHaveClass(/board-target/)
    await touch('touchEnd')
    await expect(cards(page, 'Soon')).toHaveText([/Murmurs/])
  })
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
    // Mid-drag: the lifted card, the marked column and the gap.
    if (width > 1000) {
      const from = (await card(page, 'No Exam', 'Heart sounds').boundingBox())!
      const to = (await card(page, 'Soon', 'Murmurs').boundingBox())!
      await page.mouse.move(from.x + 24, from.y + from.height / 2)
      await page.mouse.down()
      await page.mouse.move(to.x + 40, to.y + 6, { steps: 10 })
      await page.waitForTimeout(250) // let the column colours fade
      await page.screenshot({
        path: `test-results/screens/board-drag-${theme}-${width}x${height}.png`,
      })
      await page.mouse.up()
    }
  })
}
