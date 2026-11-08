import { expect, test, type Page } from '@playwright/test'
import {
  cardRecordCount,
  highlighted,
  createNotebook,
  rowAction,
  setTheme,
} from './helpers.ts'

const editor = (page: Page) => page.locator('.bn-editor')
const cardList = (page: Page) =>
  editor(page).getByRole('region', { name: /^Cards on this page/ })
const chips = (page: Page) => page.getByRole('navigation', { name: 'Sections' })

/** New page in the "Biology" notebook from a template (name pattern). */
async function newFromTemplate(page: Page, name: RegExp) {
  await rowAction(page, 'Biology', 'Add page')
  await page.getByRole('menuitem', { name: 'From template…' }).click()
  await page.getByRole('dialog').getByRole('button', { name }).click()
  await expect(page.locator('.bn-editor').first()).toBeFocused()
}
const LESSON = /^Lesson\s*Detailed/
const LARGE = /^Lesson \(large topic\)/

/** Types a question into the empty line under `heading`, makes it a card. */
async function makeCardUnder(page: Page, heading: string, question: string) {
  const block = editor(page)
    .locator('.bn-block-outer', {
      has: page.getByText(heading, { exact: true }),
    })
    .first()
  await block.locator('xpath=following-sibling::*[1]').click()
  await page.keyboard.type(question)
  await page.locator('.bn-block-content', { hasText: question }).first().hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type('An answer')
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(1)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
})

test('Lesson: a live card list that jumps to the card', async ({ page }) => {
  await newFromTemplate(page, LESSON)
  await expect(chips(page)).toHaveCount(0) // the Outline lists the headings
  await expect(cardList(page)).toContainText('No cards yet')

  await makeCardUnder(page, 'Detailed notes', 'What does the nucleus hold?')
  const rowButton = cardList(page).getByRole('button', {
    name: /What does the nucleus hold\?/,
  })
  await expect(rowButton).toContainText('New')
  await expect(cardList(page)).toContainText('1 card')

  await rowButton.click()
  await expect
    .poll(() => highlighted(page))
    .toContain('What does the nucleus hold?')

  // "Review these cards" reviews just this page.
  await cardList(page)
    .getByRole('button', { name: 'Review these cards' })
    .click()
  await expect(page.locator('main section').first()).toContainText(
    'What does the nucleus hold?',
  )
  await page.keyboard.press('Escape')
})

test('"/" menu adds a card list block', async ({ page }) => {
  const before = page.url()
  await rowAction(page, 'Biology', 'Add page')
  await page.getByRole('menuitem', { name: 'Blank page' }).click()
  await expect(page).not.toHaveURL(before)
  await page.waitForTimeout(500) // the new page's editor has settled
  await editor(page).click()
  await page.keyboard.type('/')
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.keyboard.type('card list')
  await page.getByRole('option', { name: /Card list/ }).click()
  await expect(cardList(page)).toContainText('No cards yet')
})

test('Lesson (large topic): sub-pages, links, and one list for all', async ({
  page,
}) => {
  await newFromTemplate(page, LARGE)
  await expect(cardList(page)).toHaveAccessibleName(
    'Cards on this page and its sub-pages',
  )

  await editor(page).getByRole('button', { name: 'Detailed notes' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Detailed notes',
  )
  await editor(page).locator('.bn-block-content').first().click()
  await page.keyboard.type('Name the powerhouse of the cell')
  await page
    .locator('.bn-block-content', { hasText: 'powerhouse' })
    .first()
    .hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(1)

  // Back to the lesson page (breadcrumb): the card is listed with its page.
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('button', { name: 'Untitled' })
    .click()
  const rowButton = cardList(page).getByRole('button', { name: /powerhouse/ })
  await expect(rowButton).toContainText('Detailed notes')
  await rowButton.click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Detailed notes',
  )
  await expect.poll(() => highlighted(page)).toContain('powerhouse')
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: ${theme} ${width}×${height}`, async ({ page }) => {
    await newFromTemplate(page, LESSON)
    await page.getByRole('textbox', { name: 'Page title' }).fill('Cell biology')
    await makeCardUnder(page, 'Detailed notes', 'What does the nucleus hold?')
    await setTheme(page, theme)
    await page.setViewportSize({ width, height })
    await expect(cardList(page)).toContainText('1 card')
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/lesson-${theme}-${width}x${height}.png`,
      fullPage: true,
    })
  })
}
