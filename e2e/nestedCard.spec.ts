import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  cardRecordCount,
  createNotebook,
  typeInEditor,
} from './helpers.ts'

const dialog = (page: Page) =>
  page.getByRole('dialog', { name: 'New card inside an answer' })
/** Cards on the page: [total, how many are nested in another card]. */
const cardCounts = (page: Page) =>
  page.evaluate(() => {
    // Each Card shows one "Q" label; top-level blocks are the root group's.
    const editor = document.querySelector('.bn-editor')!
    const total = editor.querySelectorAll('.recall-card-label').length
    const root = editor.querySelector('.bn-block-group')!
    const topLevel = [...root.children].filter((outer) =>
      outer.querySelector(':scope > .bn-block .recall-card-label'),
    ).length
    return [total, total - topLevel]
  })

/** A card "Outer?" with the cursor on a fresh line in its answer. */
async function cardWithAnswerLine(page: Page, cardsBefore = 0) {
  await typeInEditor(page, 'Outer?')
  await page.locator('.bn-block-content', { hasText: 'Outer?' }).first().hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type('Answer')
  await expect
    .poll(() => cardRecordCount(page), { timeout: 3000 })
    .toBe(cardsBefore + 1)
  await page.keyboard.press('Enter')
}

/** Types a "/" command where the cursor is and picks the first match. */
async function slashHere(page: Page, query: string) {
  await page.keyboard.type(`/${query}`)
  await page.keyboard.press('Enter')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
})

test('"/card" in an answer asks; Next line is the default', async ({
  page,
}) => {
  await cardWithAnswerLine(page)
  await slashHere(page, 'card')
  await expect(dialog(page)).toContainText(
    'Put the card inside this answer, or on the next line below the card?',
  )
  await expect(
    dialog(page).getByRole('button', { name: 'Next line' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog(page)).toHaveCount(0)

  // Two cards side by side, the new one not inside the first.
  await expect.poll(() => cardCounts(page)).toEqual([2, 0])
})

test('"Change in Settings" opens the setting; "Always inside" stops asking', async ({
  page,
}) => {
  await cardWithAnswerLine(page)
  await slashHere(page, 'card')
  await dialog(page).getByRole('button', { name: 'Change in Settings' }).click()

  const setting = page.getByRole('combobox', {
    name: 'New card inside an answer',
  })
  await expect(setting).toBeInViewport()
  await expect(setting).toHaveValue(/ask/i)
  await setting.selectOption({ label: 'Always inside' })

  // A fresh card on a new page: no question asked, the card goes inside.
  await addPage(page, 'Biology', 'Organelles')
  await cardWithAnswerLine(page, 1)
  await slashHere(page, 'card')
  await expect(dialog(page)).toHaveCount(0)
  await expect.poll(() => cardCounts(page)).toEqual([2, 1])
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: ${theme} ${width}×${height}`, async ({ page }) => {
    await page
      .locator('aside')
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await cardWithAnswerLine(page)
    await page.setViewportSize({ width, height })
    await slashHere(page, 'card')
    await expect(dialog(page)).toBeVisible()
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/nested-card-${theme}-${width}x${height}.png`,
    })
  })
}
