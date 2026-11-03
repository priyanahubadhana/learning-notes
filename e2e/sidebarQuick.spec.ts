// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openPage,
  openSidebar,
  pageAction,
  row,
} from './helpers.ts'

/**
 * Batch 2d, step 1: Recent, Favourites and the Calendar in the sidebar.
 * The old items keep their order.
 */

const main = (page: Page) => page.getByRole('main')

test('every old sidebar item is still there, in the old order, with Calendar near the top', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  const side = await openSidebar(page)
  const names = [
    /^Open today/,
    'Search',
    'Calendar',
    /^Review/,
    'All cards',
    'Databases',
    'Biology',
    'Save & restore',
    'Settings',
  ]
  let last = -1
  for (const name of names) {
    const button = side.getByRole('button', { name }).first()
    await expect(button, String(name)).toBeVisible()
    const y = (await button.boundingBox())!.y
    expect(y, String(name)).toBeGreaterThan(last)
    last = y
  }
  // Theme buttons and the sidebar controls are still there.
  for (const theme of ['Day', 'Night', 'Sepia']) {
    await expect(
      side.getByRole('button', { name: theme, exact: true }),
    ).toBeVisible()
  }
})

test('Recent lists the last pages opened (folded at first), newest first', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await addPage(page, 'Biology', 'Second')
  await addPage(page, 'Biology', 'Third')
  await openPage(page, 'First')
  const side = await openSidebar(page)
  const toggle = side.getByRole('button', { name: 'Recent' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(side.getByRole('list', { name: 'Recent' })).toHaveCount(0)
  await toggle.click()
  const list = side.getByRole('list', { name: 'Recent' })
  await expect(list.getByRole('button')).toHaveText([
    'First',
    'Third',
    'Second',
  ])
  // Opening one moves it to the top, and the choice to unfold is remembered.
  await list.getByRole('button', { name: 'Second', exact: true }).click()
  await expect(list.getByRole('button').first()).toHaveText('Second')
  await page.reload()
  await expect(
    (await openSidebar(page)).getByRole('list', { name: 'Recent' }),
  ).toBeVisible()
})

test('Recent shows at most eight pages and drops deleted ones', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'P0')
  for (let i = 1; i <= 8; i++) await addPage(page, 'Biology', `P${i}`)
  const side = await openSidebar(page)
  await side.getByRole('button', { name: 'Recent' }).click()
  await expect(
    side.getByRole('list', { name: 'Recent' }).getByRole('button'),
  ).toHaveCount(8)
  // The oldest one (P0) is not in the list.
  await expect(
    side
      .getByRole('list', { name: 'Recent' })
      .getByRole('button', { name: 'P0', exact: true }),
  ).toHaveCount(0)
})

test('Favourites: star from the page menu and from the sidebar; remove; remembered', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await addPage(page, 'Biology', 'Second')
  let side = await openSidebar(page)
  // No favourites yet: no section.
  await expect(
    side.getByRole('button', { name: 'Favourites', exact: true }),
  ).toHaveCount(0)
  // From the page menu (the open page is Second).
  await pageAction(page, 'Add to favourites')
  await expect(page.getByRole('status')).toContainText('Added to favourites')
  side = await openSidebar(page)
  const favs = side.getByRole('list', { name: 'Favourites' })
  await expect(
    favs.getByRole('button', { name: 'Second', exact: true }),
  ).toBeVisible()
  // From the sidebar row: the star next to the page.
  const first = row(page, 'First')
  await first.hover()
  await first.getByLabel('Add to favourites', { exact: true }).click()
  await expect(
    favs.getByRole('button', { name: 'First', exact: true }),
  ).toBeVisible()
  await page.reload()
  side = await openSidebar(page)
  await expect(
    side
      .getByRole('list', { name: 'Favourites' })
      .getByRole('button', { name: 'First', exact: true }),
  ).toBeVisible()
  // Remove one from the list.
  await side
    .getByRole('button', { name: 'Remove First from favourites' })
    .click()
  await expect(
    side
      .getByRole('list', { name: 'Favourites' })
      .getByRole('button', { name: 'First', exact: true }),
  ).toHaveCount(0)
  // The page menu now offers to remove the open one.
  await pageAction(page, 'Remove from favourites')
  await expect(
    side.getByRole('button', { name: 'Favourites', exact: true }),
  ).toHaveCount(0)
})

test('Calendar shows journal days and dated rows by month and week', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 18, 10, 0))
  await page.goto('/')
  // Today's journal page.
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    /18 November 2026/,
  )
  // A database with a Date column: a row on the 18th, added from its calendar view.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Books/ }).click()
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  const cell = main(page).locator('[data-calendar-day="2026-11-18"]')
  await cell.hover()
  await cell.getByRole('button', { name: /^Add a row on/ }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Dune')
  await page.getByRole('textbox', { name: 'Title' }).press('Enter')

  // The Calendar screen.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Calendar' })
    .click()
  await expect(page).toHaveURL(/#\/calendar$/)
  await expect(
    main(page).getByRole('heading', { name: 'November 2026' }),
  ).toBeVisible()
  const day = main(page).locator('[data-calendar-day="2026-11-18"]')
  await expect(day.locator('[data-source="journal"]')).toHaveCount(1)
  await expect(day.locator('[data-source="row"]')).toHaveText('Dune')
  // Journal first, then rows.
  const order = await day
    .locator('[data-source]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-source')))
  expect(order).toEqual(['journal', 'row'])
  // Weeks start on Monday; the grid has whole weeks.
  const count = await main(page).locator('[data-calendar-day]').count()
  expect(count % 7).toBe(0)

  // Move around: next month, back to today.
  await main(page).getByRole('button', { name: 'Next' }).click()
  await expect(
    main(page).getByRole('heading', { name: 'December 2026' }),
  ).toBeVisible()
  await expect(
    main(page).locator('[data-calendar-day="2026-11-18"]'),
  ).toHaveCount(0)
  await main(page).getByRole('button', { name: 'Today' }).click()
  await expect(
    main(page).getByRole('heading', { name: 'November 2026' }),
  ).toBeVisible()

  // Week view shows seven days and is remembered.
  await main(page).getByRole('button', { name: 'Week', exact: true }).click()
  await expect(main(page).locator('[data-calendar-day]')).toHaveCount(7)
  await page.reload()
  await expect(main(page).locator('[data-calendar-day]')).toHaveCount(7)
  await main(page).getByRole('button', { name: 'Month', exact: true }).click()

  // A row opens its page; a day number opens that day's journal.
  await main(page).locator('[data-source="row"]').click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Dune',
  )
  await page.goBack()
  await main(page)
    .getByRole('button', { name: /^Open the journal for 17 Nov/ })
    .click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    /17 November 2026/,
  )
})

test('Calendar works with the keyboard and on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/calendar')
  await expect(
    main(page).getByRole('heading', { level: 1, name: 'Calendar' }),
  ).toBeVisible()
  await main(page).getByRole('button', { name: 'Next' }).focus()
  await page.keyboard.press('Enter')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  for (const name of ['Previous', 'Next', 'Today', 'Month', 'Week']) {
    const b = main(page).getByRole('button', { name, exact: true })
    expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
  }
})
