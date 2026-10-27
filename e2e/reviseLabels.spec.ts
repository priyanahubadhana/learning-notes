import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  openPage,
  openSidebar,
  selectText,
  typeInEditor,
} from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

test('own Revise labels: add and rename in Settings, use in notes, mark a whole line', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'The first heart sound is S1')

  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Settings' })
    .click()
  await main(page).getByLabel('Search all settings').fill('Revise labels')
  await main(page).getByRole('button', { name: '+ Add label' }).click()
  const name = main(page).getByLabel('Name of label 5')
  await name.fill('Exam topic')
  await name.press('Enter')
  const first = main(page).getByLabel('Name of label 1')
  await first.fill('Big idea')
  await first.press('Enter')
  await main(page)
    .getByLabel('Colour of Exam topic')
    .getByRole('button', { name: 'Purple' })
    .click()

  // The note's toolbar offers the new names.
  await openPage(page, 'Heart sounds')
  await expect(page.locator('.bn-editor')).toContainText('first heart')
  await selectText(page, 'S1')
  await expect(
    page.getByRole('button', { name: 'Big idea', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Exam topic', exact: true }).click()
  await expect(page.locator('.recall-mark').first()).toHaveText('S1')
  await expect(page.locator('.recall-mark').first()).toHaveCSS(
    '--mark',
    '#8a5cf6',
  )

  // A whole line from the ⠿ menu.
  await page
    .locator('.bn-block-content', { hasText: 'The first heart' })
    .first()
    .hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Mark line: Big idea' }).click()
  await expect(
    page.locator('.recall-mark[data-mark="key"]').first(),
  ).toContainText('The first heart sound is')
})
