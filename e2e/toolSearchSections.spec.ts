import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Tool search (R7-13): the fixed sections Recent, Favourites and Recommended
 * show first when the search opens; one tap runs a tool; results go under
 * them once something is typed.
 */

const panel = (page: Page) => page.getByRole('dialog', { name: 'Search' })
const section = (page: Page, id: string) =>
  panel(page).locator(`[data-tool-section="${id}"]`)

test('Recent, Favourites and Recommended come first and a tap runs the tool', async ({
  page,
}) => {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')

  await page.keyboard.press('Control+Shift+K')
  await expect(section(page, 'recommended')).toBeVisible()
  await expect(section(page, 'recent')).toHaveCount(0)
  await expect(section(page, 'favourites')).toHaveCount(0)
  // Recommended is above the results list.
  const rec = (await section(page, 'recommended').boundingBox())!
  const list = (await panel(page).getByRole('listbox').boundingBox())!
  expect(rec.y).toBeLessThan(list.y)

  // One tap on Write pad runs it (and the search closes).
  await section(page, 'recommended')
    .getByRole('button', { name: 'Write pad' })
    .click()
  await expect(panel(page)).toHaveCount(0)

  // Reopened: Write pad is now Recent, one tap away.
  await page.keyboard.press('Control+Shift+K')
  await expect(section(page, 'recent')).toBeVisible()
  await expect(
    section(page, 'recent').getByRole('button', { name: 'Write pad' }),
  ).toBeVisible()

  // Typing hides the sections and shows results.
  await panel(page)
    .getByRole('combobox', { name: 'Search everything' })
    .fill('nucleus')
  await expect(page.locator('[data-tool-sections]')).toHaveCount(0)
})
