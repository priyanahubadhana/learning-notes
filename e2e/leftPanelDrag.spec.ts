import { expect, test } from '@playwright/test'
import { addPage, createNotebook, showSidebar, sidebar } from './helpers.ts'

// Desktop only on purpose (B11): this is a mouse HTML5 drag of a page row; the
// iPad stand-in sends no mouse drag, and touch reorders with "Move up" / "Move
// down" (tested in leftPanel.spec.ts). Not on the ipad-webkit list.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('pages can be dragged to a new place, and Undo puts them back', async ({
  page,
}) => {
  await createNotebook(page, 'Drag NB', 'Alpha')
  await addPage(page, 'Drag NB', 'Beta')
  await addPage(page, 'Drag NB', 'Gamma')
  await showSidebar(page)

  const names = () =>
    sidebar(page)
      .getByTestId('page-row')
      .getByRole('button', { name: /^(Alpha|Beta|Gamma)$/ })
  await expect(names()).toHaveText(['Alpha', 'Beta', 'Gamma'])

  const rows = sidebar(page).getByTestId('page-row')
  await rows
    .filter({ hasText: 'Gamma' })
    .dragTo(rows.filter({ hasText: 'Alpha' }), {
      targetPosition: { x: 40, y: 2 },
    })
  await expect(names()).toHaveText(['Gamma', 'Alpha', 'Beta'])

  await page.getByRole('button', { name: 'Undo', exact: true }).last().click()
  await expect(names()).toHaveText(['Alpha', 'Beta', 'Gamma'])
})
