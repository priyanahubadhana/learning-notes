import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, showSidebar, sidebar } from './helpers.ts'

/**
 * Sidebar v2 (slice 4, flag notebooks.v2): NB-B20 .. NB-B23. One test per
 * line. Held rows and the strip on sidebar rows (NB-B24, NB-B25), the page
 * drag lines (NB-P25) and the Professional groups (NB-P20..P24) are the next
 * commits.
 */
const FLAG = '/?flags=notebooks.v2'

async function start(page: Page) {
  await page.goto(FLAG)
  await createNotebook(page, 'Alpha book', 'Alpha page')
  await createNotebook(page, 'Zeta book', 'Zeta page')
  await showSidebar(page)
}

test('NB-B20 the sidebar top: Today, Search, Review; rows are tall enough to tap', async ({
  page,
}) => {
  await start(page)
  const side = sidebar(page)
  await expect(side.getByRole('button', { name: /today/i })).toBeVisible()
  await expect(side.getByRole('button', { name: /^Search/ })).toBeVisible()
  await expect(side.getByRole('button', { name: 'Review' })).toBeVisible()
  const row = side.locator('[data-notebook-row]').first()
  expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(36)
})

test('NB-B21 the chevron folds one notebook and the choice is remembered', async ({
  page,
}) => {
  await start(page)
  const side = sidebar(page)
  await expect(
    side.getByRole('button', { name: 'Alpha page', exact: true }),
  ).toBeVisible()
  await side
    .locator('[data-notebook-row]')
    .first()
    .getByRole('button', { name: 'Collapse' })
    .click()
  await expect(
    side.getByRole('button', { name: 'Alpha page', exact: true }),
  ).toBeHidden()
  await page.reload()
  await showSidebar(page)
  await expect(
    side.getByRole('button', { name: 'Alpha page', exact: true }),
  ).toBeHidden()
  await expect(
    side.getByRole('button', { name: 'Zeta page', exact: true }),
  ).toBeVisible()
})

test('NB-B22 Collapse all folds every notebook; the same button reads Expand all', async ({
  page,
}) => {
  await start(page)
  const side = sidebar(page)
  const all = side.getByTestId('nbv2-collapse-all')
  await expect(all).toHaveAccessibleName('Collapse all')
  await all.click()
  await expect(
    side.getByRole('button', { name: 'Alpha page', exact: true }),
  ).toBeHidden()
  await expect(
    side.getByRole('button', { name: 'Zeta page', exact: true }),
  ).toBeHidden()
  await expect(all).toHaveAccessibleName('Expand all')
  await all.click()
  await expect(
    side.getByRole('button', { name: 'Alpha page', exact: true }),
  ).toBeVisible()
  await expect(
    side.getByRole('button', { name: 'Zeta page', exact: true }),
  ).toBeVisible()
  await expect(all).toHaveAccessibleName('Collapse all')
})

test('NB-B22 with the switch off there is no Collapse all (today unchanged)', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Alpha book', 'Alpha page')
  await showSidebar(page)
  await expect(sidebar(page).getByTestId('nbv2-collapse-all')).toHaveCount(0)
})

test('NB-B23 the page you are on is bold and marked as current', async ({
  page,
}) => {
  await start(page)
  await addPage(page, 'Zeta book', 'Second', 'page')
  const side = sidebar(page)
  const current = side.getByRole('button', { name: 'Second', exact: true })
  await expect(current).toHaveAttribute('aria-current', 'page')
  await expect(
    side.getByRole('button', { name: 'Zeta page', exact: true }),
  ).not.toHaveAttribute('aria-current', 'page')
})
