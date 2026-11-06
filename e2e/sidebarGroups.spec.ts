// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  sidebar,
  cornerAction,
  corner,
  openCorner,
  openTrash,
} from './helpers.ts'

/**
 * The sidebar is folding groups: Study, Quick access, Notebooks, Tags,
 * Templates (and Saved searches when there is one), each with a heading
 * button (aria-expanded, remembered per device). Today and Search stay on
 * top; Save & restore, Trash, Settings and the themes sit below a divider.
 * Every old item is still reachable and the row action buttons are unchanged.
 */

test.use({ viewport: { width: 1280, height: 1000 } })

const group = (page: Page, name: string) =>
  sidebar(page)
    .locator('section[data-group]')
    .filter({
      has: page.getByRole('button', { name, exact: true }),
    })
const heading = (page: Page, name: string) =>
  sidebar(page).getByRole('button', { name, exact: true })

async function start(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
}

test('the groups, in order, with Today and Search on top and the rest below a divider', async ({
  page,
}) => {
  await start(page)
  const names = ['Study', 'Quick access', 'Notebooks', 'Tags', 'Templates']
  const ys: number[] = []
  for (const name of names) {
    await expect(heading(page, name)).toBeVisible()
    ys.push((await heading(page, name).boundingBox())!.y)
  }
  expect([...ys].sort((a, b) => a - b)).toEqual(ys)
  const today = await sidebar(page)
    .getByRole('button', { name: /Open today/ })
    .boundingBox()
  const search = await sidebar(page)
    .getByRole('button', { name: /^Search/ })
    .boundingBox()
  expect(today!.y).toBeLessThan(ys[0])
  expect(search!.y).toBeLessThan(ys[0])
  // Not folding: they are not group headings.
  await expect(group(page, 'Study')).toHaveCount(1)
  // Save & restore, Trash, Settings and the themes live in the quiet corner.
  const panel = await openCorner(page)
  for (const name of ['Save & restore', 'Settings']) {
    await expect(panel.getByRole('button', { name })).toBeVisible()
  }
  await expect(panel.getByRole('button', { name: /^Trash/ })).toBeVisible()
  for (const theme of ['Day', 'Night', 'Sepia']) {
    await expect(
      panel.getByRole('button', { name: theme, exact: true }),
    ).toBeVisible()
  }
})

test('the opening state: Study, Quick access and Notebooks open; Tags and Templates folded', async ({
  page,
}) => {
  await start(page)
  for (const [name, expanded] of [
    ['Study', 'true'],
    ['Quick access', 'true'],
    ['Notebooks', 'true'],
    ['Tags', 'false'],
    ['Templates', 'false'],
  ]) {
    await expect(heading(page, name)).toHaveAttribute('aria-expanded', expanded)
  }
})

test('every old item is still reachable', async ({ page }) => {
  await start(page)
  const side = sidebar(page)
  // Study
  await expect(
    side.getByRole('button', { name: /^Review/, exact: false }).first(),
  ).toBeVisible()
  await expect(side.getByRole('button', { name: 'All cards' })).toBeVisible()
  // Quick access
  await expect(side.getByRole('button', { name: 'Calendar' })).toBeVisible()
  await expect(side.getByRole('button', { name: 'Databases' })).toBeVisible()
  await expect(side.getByRole('button', { name: 'Recent' })).toBeVisible()
  // Notebooks, with the row buttons as they were (+ ⟳ ✎ ×)
  await expect(
    side.getByRole('button', { name: 'Biology', exact: true }),
  ).toBeVisible()
  await expect(side.getByLabel('New notebook')).toBeVisible()
  const row = side.locator('div.group').filter({
    has: page.getByRole('button', { name: 'Biology', exact: true }),
  })
  for (const label of [
    'Add page',
    'Review this notebook',
    'Rename',
    'Delete notebook',
  ]) {
    await expect(row.getByLabel(label, { exact: true })).toHaveCount(1)
  }
  // Tags: folded, then open with its + button
  await heading(page, 'Tags').click()
  await expect(side.getByLabel('New tag').first()).toBeVisible()
  // Templates: folded, then open with the starters
  await heading(page, 'Templates').click()
  await expect(
    side.getByRole('button', { name: 'Daily journal' }),
  ).toBeVisible()
  await expect(side.getByLabel('New template')).toBeVisible()
  // Save & restore, Trash and Settings open their screens.
  await cornerAction(page, 'Save & restore')
  await expect(
    page.getByRole('heading', { name: /Save/ }).first(),
  ).toBeVisible()
  await cornerAction(page, 'Settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await openTrash(page)
  await expect(corner(page).getByText('Trash is empty')).toBeVisible()
})

test('each group folds and unfolds with its heading button', async ({
  page,
}) => {
  await start(page)
  const side = sidebar(page)
  const checks: [string, () => ReturnType<Page['locator']>][] = [
    ['Study', () => side.getByRole('button', { name: 'All cards' })],
    ['Quick access', () => side.getByRole('button', { name: 'Calendar' })],
    [
      'Notebooks',
      () => side.getByRole('button', { name: 'Biology', exact: true }),
    ],
  ]
  for (const [name, item] of checks) {
    await expect(item()).toBeVisible()
    await heading(page, name).click()
    await expect(heading(page, name)).toHaveAttribute('aria-expanded', 'false')
    await expect(item()).toBeHidden()
    await heading(page, name).click()
    await expect(heading(page, name)).toHaveAttribute('aria-expanded', 'true')
    await expect(item()).toBeVisible()
  }
  // Tags and Templates start folded.
  await heading(page, 'Tags').click()
  await expect(side.getByText(/No tags yet/)).toBeVisible()
  await heading(page, 'Tags').click()
  await expect(side.getByText(/No tags yet/)).toBeHidden()
})

test('a heading works from the keyboard (Enter and Space)', async ({
  page,
}) => {
  await start(page)
  await heading(page, 'Study').focus()
  await page.keyboard.press('Enter')
  await expect(heading(page, 'Study')).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Space')
  await expect(heading(page, 'Study')).toHaveAttribute('aria-expanded', 'true')
})

test('the folded or open state of every group is remembered after a reload', async ({
  page,
}) => {
  await start(page)
  await heading(page, 'Study').click() // fold
  await heading(page, 'Notebooks').click() // fold
  await heading(page, 'Tags').click() // open
  await page.reload()
  await expect(heading(page, 'Study')).toHaveAttribute('aria-expanded', 'false')
  await expect(heading(page, 'Quick access')).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(heading(page, 'Notebooks')).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(heading(page, 'Tags')).toHaveAttribute('aria-expanded', 'true')
  await expect(heading(page, 'Templates')).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  // Notebooks folded: no notebook rows, but the heading's + still adds one.
  await expect(
    sidebar(page).getByRole('button', { name: 'Biology', exact: true }),
  ).toBeHidden()
  await expect(sidebar(page).getByLabel('New notebook')).toBeVisible()
})

test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: false })
  test('rows and headings are at least 44 px tall on a touch screen', async ({
    page,
  }) => {
    await start(page)
    for (const name of ['Study', 'Quick access', 'Notebooks']) {
      const b = await heading(page, name).boundingBox()
      expect(b!.height, name).toBeGreaterThanOrEqual(43.5)
    }
    const review = await sidebar(page)
      .getByRole('button', { name: /^Review/, exact: false })
      .first()
      .boundingBox()
    expect(review!.height).toBeGreaterThanOrEqual(43.5)
  })
})
