import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  confirmDialog,
  createNotebook,
  highlighted,
  makeCard,
  openSearchPopup,
  rowAction,
  searchResults,
  sidebar,
  typeInEditor,
  setTheme,
} from './helpers.ts'

const title = (page: Page) => page.getByRole('textbox', { name: 'Page title' })
const screenBox = (page: Page) =>
  page.getByRole('main').getByRole('searchbox', { name: 'Search everything' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await typeInEditor(page, 'The nucleus holds DNA')
  await page.keyboard.press('Enter')
  await makeCard(page, 'What does the nucleus hold?', 1)
  await addPage(page, 'Biology', 'Energy')
  await typeInEditor(page, 'Mitochondria make energy')
  await page.waitForTimeout(700) // autosave
})

test('popup: recent pages, grouped results, keyboard, open at the block', async ({
  page,
}) => {
  let popup = await openSearchPopup(page)
  // Before typing: recently opened pages, newest first.
  await expect(popup.getByRole('option')).toHaveText([/Energy/, /Cells/])
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()

  popup = await openSearchPopup(page)
  await page.keyboard.type('NUCLEUS')
  await expect(popup.getByRole('group', { name: 'Notes' })).toContainText(
    'The nucleus holds DNA',
  )
  await expect(popup.getByRole('group', { name: 'Cards' })).toContainText(
    'What does the nucleus hold?',
  )
  await expect(popup.locator('mark').first()).toHaveText('nucleus')

  // Cards chip: only cards.
  await popup.getByRole('button', { name: 'Cards', exact: true }).click()
  await expect(popup.getByRole('option')).toHaveCount(1)
  await popup.getByRole('button', { name: 'All', exact: true }).click()
  await expect(popup.getByRole('option')).toHaveCount(2)

  // ↓ Enter opens the first result (the note) at its block. Clicking a
  // chip left the cursor in the search box.
  await expect(popup.getByRole('combobox')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(popup).toBeHidden()
  await expect(title(page)).toHaveValue('Cells')
  await expect.poll(() => highlighted(page)).toContain('nucleus holds')

  // The sidebar button opens it too; Enter without a pick shows all.
  await sidebar(page)
    .getByRole('button', { name: /^Search/ })
    .click()
  await page.keyboard.type('mitochondria')
  await expect(
    page.getByRole('dialog', { name: 'Search' }).getByRole('option'),
  ).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
  await expect(screenBox(page)).toHaveValue('mitochondria')
  await expect(searchResults(page).getByRole('option')).toHaveCount(1)
})

test('Search screen: filters, views, Did you mean, Trash, Review these cards', async ({
  page,
}) => {
  await openSearchPopup(page)
  await page.keyboard.type('nucleus')
  await page.getByRole('button', { name: /See all 2 results/ }).click()
  await expect(searchResults(page).getByRole('option')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /^Notes/ })).toContainText('1')

  // Card status filter, with counts.
  await page.getByRole('button', { name: 'Card status' }).click()
  await page.getByRole('menuitem', { name: /New/ }).click()
  await expect(searchResults(page).getByRole('option')).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove filter New' }).click()
  await expect(searchResults(page).getByRole('option')).toHaveCount(2)

  // Views.
  await page.getByRole('button', { name: 'Grouped' }).click()
  await expect(
    page.getByRole('heading', { name: /Biology › Cells/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'List' }).click()

  // Did you mean…?
  await screenBox(page).fill('nucleos')
  await expect(page.getByText('No results for “nucleos”.')).toBeVisible()
  await page.getByRole('button', { name: 'nucleus' }).click()
  await expect(screenBox(page)).toHaveValue('nucleus')
  await expect(searchResults(page).getByRole('option')).toHaveCount(2)

  // Review these cards.
  await page.getByRole('button', { name: 'Review these cards (1)' }).click()
  await expect(
    page.getByRole('heading', { name: 'Review · nucleus' }),
  ).toBeVisible()
})

test('Trash: found only when asked; Restore brings the page back', async ({
  page,
}) => {
  await rowAction(page, 'Energy', 'Delete page')
  await confirmDialog(page, 'Delete')

  await openSearchPopup(page)
  await page.keyboard.type('mitochondria')
  await page.getByRole('button', { name: 'Search Trash (1)' }).click()
  const result = searchResults(page).getByRole('option')
  await expect(result).toContainText('In Trash')
  await result.click()
  await expect(page.getByText('“Energy” is in the Trash.')).toBeVisible()
  await page.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(title(page)).toHaveValue('Energy')
  await expect(
    sidebar(page).getByRole('button', { name: 'Energy', exact: true }),
  ).toBeVisible()
})

test('saved searches: save, open, change, review the deck, rename, delete', async ({
  page,
}) => {
  await openSearchPopup(page)
  await page.keyboard.type('nucleus')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: '☆ Save search' }).click()
  const name = page.getByRole('textbox', { name: 'Name' })
  await expect(name).toHaveValue('nucleus')
  await name.fill('Nucleus deck')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(
    page.getByText('Saved “Nucleus deck” in the sidebar'),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Nucleus deck' }),
  ).toBeVisible()
  const saved = sidebar(page).locator('div.group', { hasText: 'Nucleus deck' })
  await expect(saved).toContainText('2')
  await saved.hover()
  await page.screenshot({ path: 'test-results/screens/saved-search-Day.png' })

  // Review the deck from the sidebar.
  await saved.getByLabel('Review this deck (1 card)').click()
  await expect(
    page.getByRole('heading', { name: 'Review · Nucleus deck' }),
  ).toBeVisible()

  // Open it again, change it, save the change.
  await saved.getByRole('button', { name: 'Nucleus deck' }).click()
  await expect(screenBox(page)).toHaveValue('nucleus')
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(
    0,
  )
  await page.getByRole('button', { name: /^Cards/ }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Saved changes to “Nucleus deck”')).toBeVisible()
  await expect(saved).toContainText('1')

  // Rename, then delete (notes stay).
  await saved.hover()
  await saved.getByLabel('Rename saved search').click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Cell deck')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Rename', exact: true })
    .click()
  const renamed = sidebar(page).locator('div.group', { hasText: 'Cell deck' })
  await expect(renamed).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cell deck' })).toBeVisible()
  await renamed.hover()
  await renamed.getByLabel('Delete saved search').click()
  await confirmDialog(page, 'Delete')
  await expect(sidebar(page).getByText('Saved searches')).toHaveCount(0)
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
  ['Day', 844, 390],
] as const) {
  test(`screenshots: ${theme} ${width}×${height}`, async ({ page }) => {
    await setTheme(page, theme)
    await page.setViewportSize({ width, height })
    await openSearchPopup(page)
    await page.keyboard.type('nucleus')
    await expect(page.locator('mark').first()).toBeVisible()
    await page.waitForTimeout(400) // let the theme fade finish
    const name = `${theme}-${width}x${height}`
    await page.screenshot({
      path: `test-results/screens/search-popup-${name}.png`,
    })
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'More filters' }).click()
    await expect(searchResults(page).getByRole('option')).toHaveCount(2)
    await page.screenshot({
      path: `test-results/screens/search-screen-${name}.png`,
    })
  })
}
