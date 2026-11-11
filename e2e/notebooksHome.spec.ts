import { expect, test } from '@playwright/test'
import { createNotebook, showSidebar, sidebar } from './helpers.ts'

// Notebooks home (owner-approved design, 9 Nov): the Notebooks icon opens a
// shelf of covers; star pins first; list view; the sidebar rows get a tile.

test('Notebooks icon opens the shelf; star pins; list view; sidebar tile', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Alpha book', 'A page')
  await createNotebook(page, 'Zeta book', 'Z page')

  await showSidebar(page)
  // The sidebar row has a coloured tile.
  await expect(
    sidebar(page).locator('[data-notebook-tile]').first(),
  ).toBeAttached()

  // The rail icon opens the home (on a phone: it is the second tap that does).
  const rail = page.locator('[data-space="notebooks"]')
  await rail.click()
  const home = page.getByTestId('notebooks-home')
  if (!(await home.isVisible())) {
    await page.keyboard.press('Escape')
    await rail.click()
  }
  await expect(home).toBeVisible()
  const cards = home.locator('[data-notebook-card]')
  await expect(cards.filter({ hasText: 'Alpha book' })).toBeVisible()
  await expect(home.getByTestId('nbh-add-tile')).toBeVisible()

  // Pin the last one: it moves to the front.
  await home.getByRole('button', { name: 'Pin Zeta book' }).click()
  await expect(cards.first()).toContainText('Zeta book')
  await expect(
    home.getByRole('button', { name: 'Unpin Zeta book' }),
  ).toHaveAttribute('aria-pressed', 'true')

  // List view.
  await home.locator('[data-layout="list"]').click()
  await expect(cards.first()).toContainText('Zeta book')
  await expect(home.locator('[data-layout="list"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Opening a notebook leaves the home.
  await cards
    .filter({ hasText: 'Alpha book' })
    .getByRole('button')
    .first()
    .click()
  await expect(home).toBeHidden()
})

test('Review icon shows the Review space, not the shelf', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Alpha book', 'A page')
  await page.locator('[data-space="review"]').click()
  await expect(page.getByTestId('review-home')).toBeVisible()
  await expect(page.getByTestId('notebooks-home')).toHaveCount(0)
})

test('Home tabs: All, Starred and Recent', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Alpha book', 'A page')
  await createNotebook(page, 'Zeta book', 'Z page')
  await showSidebar(page)
  const rail = page.locator('[data-space="notebooks"]')
  await rail.click()
  const home = page.getByTestId('notebooks-home')
  if (!(await home.isVisible())) {
    await page.keyboard.press('Escape')
    await rail.click()
  }
  const cards = home.locator('[data-notebook-card]')
  const tab = (id: string) => home.locator(`[data-home-tab="${id}"]`)
  await expect(tab('all')).toHaveAttribute('aria-selected', 'true')
  await expect(cards).toHaveCount(2)

  // Starred: empty until one is pinned.
  await tab('starred').click()
  await expect(home.getByTestId('nbh-empty')).toBeVisible()
  await expect(cards).toHaveCount(0)
  await tab('all').click()
  await home.getByRole('button', { name: 'Pin Alpha book' }).click()
  await tab('starred').click()
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('Alpha book')
  await expect(home.getByTestId('nbh-add-tile')).toHaveCount(0)

  // Recent: both, the one opened last first; the choice is kept on reload.
  await tab('recent').click()
  await expect(cards).toHaveCount(2)
  await page.reload()
  await page.locator('[data-space="notebooks"]').click()
  await expect(tab('recent')).toHaveAttribute('aria-selected', 'true')
})
