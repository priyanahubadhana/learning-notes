import { expect, test, type Page } from '@playwright/test'
import {
  cardRecordCount,
  createNotebook,
  openGroup,
  openSidebar,
  rowAction,
} from './helpers.ts'

/** E2: memory templates, the helpers dialog, Walk the route. */

const editor = (page: Page) => page.locator('.bn-editor')
const dialog = (page: Page) => page.getByRole('dialog')

async function openHelpers(page: Page) {
  await openGroup(page, 'Templates')
  const side = await openSidebar(page)
  await side.locator('[data-memory-helpers]').click()
  await expect(dialog(page).getByText('Memory helpers').first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Palaces', 'First')
})

test('Memory palace: rooms, How to use, evidence; cards walk the route in order', async ({
  page,
}) => {
  await rowAction(page, 'Palaces', 'Add page')
  await page.getByRole('menuitem', { name: 'From template…' }).click()
  await dialog(page)
    .getByRole('button', { name: /^Memory palace/ })
    .click()
  await expect(editor(page).getByText('How to use')).toBeVisible()
  await expect(editor(page).getByText(/^Evidence:/)).toBeVisible()
  await expect(editor(page).getByText('Room 3')).toBeVisible()

  // Type a question into each room's card.
  const cards = editor(page).locator('[data-content-type="card"]')
  await expect(cards).toHaveCount(3)
  for (const [i, q] of [
    'Door: milk',
    'Sofa: eggs',
    'Window: bread',
  ].entries()) {
    await cards.nth(i).click()
    await page.keyboard.type(q)
  }
  await expect.poll(() => cardRecordCount(page), { timeout: 5000 }).toBe(3)

  // A deck with Walk the route.
  const side = await openSidebar(page)
  await side.getByRole('button', { name: 'All cards', exact: true }).click()
  await page.getByRole('main').getByRole('button', { name: 'New deck' }).click()
  const d = dialog(page)
  await d.getByRole('checkbox', { name: 'Palaces' }).check()
  await d.getByRole('button', { name: 'Next' }).click()
  await d.getByRole('checkbox', { name: /Walk the route/ }).check()
  await d.getByRole('button', { name: 'Next' }).click()
  await d.getByLabel('Deck name').fill('Shopping route')
  await d.getByRole('button', { name: 'Create deck' }).click()
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Study Shopping route' })
    .click()
  await expect(page.getByText('Door: milk').first()).toBeVisible()
})

test('Memory helpers: Major system word ideas and the acronym card', async ({
  page,
}) => {
  await openHelpers(page)
  const d = dialog(page)
  await d.getByLabel('A number').fill('32')
  await expect(
    d.locator('[data-major-piece="32"]').getByRole('button', { name: 'moon' }),
  ).toBeVisible()
  // Keep a pick, then add an own word.
  await d
    .locator('[data-major-piece="32"]')
    .getByRole('button', { name: 'moon' })
    .click()
  await expect(
    d.locator('[data-major-piece="32"]').getByRole('button', { name: 'moon' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await d.getByLabel('List, one item per line').fill('Red\nOrange\nYellow')
  await expect(d.locator('[data-acronym]')).toHaveText('ROY')
  await d.getByRole('button', { name: 'Make a card on this page' }).click()
  await expect(d.getByRole('button', { name: 'Card made' })).toBeVisible()
  await expect.poll(() => cardRecordCount(page), { timeout: 5000 }).toBe(1)
})
