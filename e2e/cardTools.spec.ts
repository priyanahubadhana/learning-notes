import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  makeCard,
  openPage,
  openSearchPopup,
  searchResults,
  sidebar,
} from './helpers.ts'

/** Card tools in Search (Phase 4 Step 6): Most failed, empty-card cleanup. */

const options = (page: Page) => searchResults(page).getByRole('option')

/** Search screen listing every card (Cards chip, no words). */
async function browseCards(page: Page) {
  const popup = await openSearchPopup(page)
  await popup.getByRole('button', { name: 'Cards', exact: true }).click()
  await page.keyboard.press('Enter')
  await expect(popup).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  // A card whose question is then cleared: an empty card with an answer.
  await makeCard(page, 'Temporary', 1)
  await page.locator('.bn-block-content', { hasText: 'Temporary' }).click()
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  await page.keyboard.press('Backspace')
  await addPage(page, 'Biology', 'Energy')
  await makeCard(page, 'What makes ATP?', 2)
  await page.waitForTimeout(700) // autosave
})

test('Most failed: cards rated Again come first, with their count', async ({
  page,
}) => {
  // The empty card is never reviewed: only one card is due.
  const review = sidebar(page).getByRole('button', { name: /^Review(?! this)/ })
  await expect(review).toContainText('1')
  await review.click()
  await page.getByRole('button', { name: 'Show answer' }).click()
  await page.getByRole('button', { name: /^Again/ }).click()
  await expect(page.getByRole('button', { name: /^Again/ })).toBeHidden()

  await browseCards(page)
  await page.getByRole('button', { name: 'More filters' }).click()
  await page.getByRole('radio', { name: 'Most failed cards' }).check()
  await expect(options(page)).toHaveCount(2)
  await expect(options(page).first()).toContainText('What makes ATP?')
  await expect(options(page).first()).toContainText('Wrong 1×')
  await expect(options(page).nth(1)).toContainText('Card with no question')
  await expect(options(page).nth(1)).toContainText('Empty')
  // Empty cards are not part of "Review these cards".
  await expect(
    page.getByRole('button', { name: 'Review these cards (1)' }),
  ).toBeVisible()
})

test('empty cards: listed, removed with answers kept, Undo', async ({
  page,
}) => {
  await browseCards(page)
  await page.getByRole('button', { name: 'Card status' }).click()
  await page.getByRole('menuitem', { name: /Empty \(no question\)/ }).click()
  await expect(options(page)).toHaveCount(1)
  await expect(options(page)).toContainText('Card with no question')

  const remove = page.getByRole('button', { name: 'Remove 1 empty card' })
  await remove.click()
  await expect(page.getByText('Removed 1 empty card')).toBeVisible()
  await expect(options(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(options(page)).toHaveCount(1)

  await remove.click()
  await expect(options(page)).toHaveCount(0)
  // The answer stays on the page, as a normal line.
  await openPage(page, 'Cells')
  const editor = page.locator('.bn-editor')
  await expect(editor).toContainText('An answer')
  await expect(editor.locator('[data-content-type="card"]')).toHaveCount(0)
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
  ['Day', 844, 390],
] as const) {
  test(`screenshots: ${theme} ${width}×${height}`, async ({ page }) => {
    await sidebar(page)
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await sidebar(page)
      .getByRole('button', { name: /^Review(?! this)/ })
      .click()
    await page.getByRole('button', { name: 'Show answer' }).click()
    await page.getByRole('button', { name: /^Again/ }).click()
    await expect(page.getByRole('button', { name: /^Again/ })).toBeHidden()
    await page.setViewportSize({ width, height })
    await browseCards(page)
    await page.getByRole('button', { name: 'More filters' }).click()
    await page.getByRole('radio', { name: 'Most failed cards' }).check()
    await expect(options(page).first()).toContainText('Wrong 1×')
    await page.waitForTimeout(400) // let the theme fade finish
    const name = `${theme}-${width}x${height}`
    await page.screenshot({
      path: `test-results/screens/most-failed-${name}.png`,
    })
    await page.getByRole('button', { name: 'More filters' }).click()
    await page.getByRole('button', { name: 'Card status' }).click()
    await page.getByRole('menuitem', { name: /Empty \(no question\)/ }).click()
    await expect(options(page)).toHaveCount(1)
    await page.screenshot({
      path: `test-results/screens/empty-cards-${name}.png`,
    })
  })
}
