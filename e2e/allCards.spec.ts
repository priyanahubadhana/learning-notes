import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  cardRecordCount,
  createNotebook,
  highlighted,
  sidebar,
  typeInEditor,
} from './helpers.ts'

const hub = (page: Page) => page.getByRole('list', { name: 'All cards' })
const search = (page: Page) =>
  page.getByRole('searchbox', { name: 'Search cards' })

/** Writes a question and turns it into a card (`total` cards afterwards). */
async function makeCard(page: Page, question: string, total: number) {
  await typeInEditor(page, question)
  await page.locator('.bn-block-content', { hasText: question }).first().hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type('An answer')
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(total)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await makeCard(page, 'What does the nucleus hold?', 1)
  await addPage(page, 'Biology', 'Energy')
  await makeCard(page, 'Name the powerhouse of the cell', 2)
})

test('All cards lists every card; search filters; a card opens its note', async ({
  page,
}) => {
  await sidebar(page).getByRole('button', { name: 'All cards' }).click()
  await expect(hub(page).getByRole('button')).toHaveCount(2)
  await expect(hub(page)).toContainText('Biology · Cells')
  await expect(hub(page)).toContainText('Biology · Energy')
  await expect(hub(page).getByRole('button').first()).toContainText('New')

  await search(page).fill('POWERHOUSE')
  await expect(hub(page).getByRole('button')).toHaveCount(1)
  await search(page).fill('zebra')
  await expect(page.getByText('No cards match “zebra”.')).toBeVisible()

  await search(page).fill('nucleus')
  await hub(page)
    .getByRole('button', { name: /nucleus/ })
    .click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Cells',
  )
  await expect.poll(() => highlighted(page)).toContain('nucleus')
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: ${theme} ${width}×${height}`, async ({ page }) => {
    await sidebar(page)
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await sidebar(page).getByRole('button', { name: 'All cards' }).click()
    await page.setViewportSize({ width, height })
    await expect(hub(page).getByRole('button')).toHaveCount(2)
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/all-cards-${theme}-${width}x${height}.png`,
    })
  })
}
