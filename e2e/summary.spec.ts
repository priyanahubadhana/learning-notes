import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  openSidebar,
  selectText,
  typeInEditor,
} from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const pageTab = (page: Page, name: string) =>
  page.locator(`[data-page-tab="${name}"]`)

test('Add to Summary keeps the line linked; page, notebook and app Summaries show it', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'The first heart sound is S1')
  await selectText(page, 'first heart sound')
  await page
    .getByRole('button', { name: 'Add to Summary', exact: true })
    .click()
  await expect(page.getByText('Added to the Summary')).toBeVisible()
  await page.waitForTimeout(800) // autosave

  // Page level: Notes · Summary · Review.
  await pageTab(page, 'summary').click()
  const line = main(page).locator('[data-summary-line]')
  await expect(line).toHaveCount(1)
  await expect(line).toContainText('The first heart sound is S1')
  // The editor is only hidden, so the note keeps its text.
  await pageTab(page, 'notes').click()
  await expect(page.locator('.bn-editor')).toContainText('first heart sound')

  // Editing the note updates the Summary (the line is linked).
  await selectText(page, 'first heart sound')
  await page.keyboard.press('End')
  await page.keyboard.type(' and S2')
  await expect(page.locator('.bn-editor')).toContainText('S1 and S2')
  await page.waitForTimeout(1200)
  await pageTab(page, 'summary').click()
  await expect(line).toContainText('The first heart sound is S1 and S2')

  // Adding the same line again keeps one.
  await pageTab(page, 'notes').click()
  await selectText(page, 'first heart sound')
  await page
    .getByRole('button', { name: 'Add to Summary', exact: true })
    .click()
  await expect(
    page.getByText('This line is already in the Summary'),
  ).toBeVisible()

  // A typed line.
  await pageTab(page, 'summary').click()
  await main(page)
    .getByRole('textbox', { name: 'Add a line' })
    .fill('S1 is the lub')
  await main(page).getByRole('button', { name: 'Add', exact: true }).click()
  await expect(main(page).locator('[data-summary-line]')).toHaveCount(2)

  // Review view: counts and Practise.
  await pageTab(page, 'review').click()
  await expect(main(page).locator('[data-review-counts]')).toContainText('due')

  // Notebook level: the Summary tab lists every page's lines.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Summary' }).click()
  await expect(main(page).locator('[data-summary-line]')).toHaveCount(2)
  await expect(main(page)).toContainText('Heart sounds')

  // App level: All summaries.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'All summaries' })
    .click()
  await expect(main(page).locator('[data-summary-line]')).toHaveCount(2)
  await main(page).getByRole('combobox').selectOption({ label: 'Cardiology' })
  await expect(main(page).locator('[data-summary-line]')).toHaveCount(2)
  // Notes and Review sit next to it.
  await pageTab(page, 'notes').click()
  await expect(main(page)).toContainText('Recently edited pages')
  await pageTab(page, 'review').click()
  await expect(main(page)).toContainText('All cards')

  // Removing a line leaves the note.
  await pageTab(page, 'summary').click()
  await main(page)
    .locator('[data-summary-line]')
    .first()
    .getByRole('button', { name: 'Remove from the Summary' })
    .click()
  await expect(main(page).locator('[data-summary-line]')).toHaveCount(1)
})
