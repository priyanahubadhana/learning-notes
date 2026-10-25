import { expect, test, type Page } from '@playwright/test'
import {
  cardRecordCount,
  createNotebook,
  selectText,
  sidebar,
  typeInEditor,
} from './helpers.ts'

const hub = (page: Page) => page.getByRole('list', { name: 'All cards' })

/** Opens the ⋮⋮ block menu of the block containing `text`. */
async function openBlockMenu(page: Page, text: string) {
  await page.locator('.bn-block-content', { hasText: text }).first().hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
}

async function duplicate(page: Page, text: string) {
  await openBlockMenu(page, text)
  await page.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect(
    page.locator('.bn-block-content', { hasText: text }),
  ).toHaveCount(2)
}

test('A duplicated Card is its own card in All cards and Review', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'Which valves close in S2?')
  await openBlockMenu(page, 'Which valves close in S2?')
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type('Aortic and pulmonary')
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(1)

  await duplicate(page, 'Which valves close in S2?')
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(2)

  await page.reload()
  await sidebar(page).getByRole('button', { name: 'All cards' }).click()
  await expect(hub(page).getByRole('button')).toHaveCount(2)
  await expect(
    sidebar(page)
      .getByRole('button', { name: /Review/ })
      .first(),
  ).toContainText('2')
})

test('A duplicated fill-in-the-blank line is its own card', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'S2 closes the aortic and pulmonary valves')
  await selectText(page, 'aortic and pulmonary')
  await page
    .getByRole('button', { name: 'Make blank (hide these words in review)' })
    .click()
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(1)

  await duplicate(page, 'S2 closes the')
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(2)

  await page.reload()
  await sidebar(page).getByRole('button', { name: 'All cards' }).click()
  await expect(hub(page).getByRole('button')).toHaveCount(2)
})
