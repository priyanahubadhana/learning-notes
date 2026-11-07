import { expect, test, type Page } from '@playwright/test'
import { closeCorner, createNotebook, openSidebar } from './helpers.ts'

/** Polish 1 · item 8: every first-run screen names its single next step. */

const main = (page: Page) => page.getByRole('main')

async function openHome(page: Page, tab: 'Tasks' | 'Routines') {
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await page.getByRole('tab', { name: tab, exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Library: an empty library offers Import your first book, which opens the file picker', async ({
  page,
}) => {
  await closeCorner(page)
  await page.locator('[data-space="library"]').click()
  const empty = page.getByTestId('library-empty')
  await expect(empty).toBeVisible()
  const chooser = page.waitForEvent('filechooser')
  await empty.getByRole('button', { name: 'Import your first book' }).click()
  await chooser
})

test('Tasks: an empty inbox offers Add a task, which focuses the box', async ({
  page,
}) => {
  await openHome(page, 'Tasks')
  const empty = page.getByTestId('inbox-empty')
  await expect(empty).toBeVisible()
  await empty.getByRole('button', { name: 'Add a task' }).click()
  await expect(page.getByTestId('quick-add')).toBeFocused()
})

test('Routines: no habits offers Add a habit, which focuses the first box', async ({
  page,
}) => {
  await openHome(page, 'Routines')
  const empty = page.getByTestId('routines-empty')
  await expect(empty).toBeVisible()
  await empty.getByRole('button', { name: 'Add a habit' }).click()
  await expect(page.getByTestId('habit-name-morning')).toBeFocused()
  // Once there is a habit the empty screen goes away.
  await page.getByTestId('habit-name-morning').fill('Stretch')
  await page.getByTestId('habit-name-morning').press('Enter')
  await expect(page.getByTestId('routines-empty')).toHaveCount(0)
})

test('Decks: no decks offers Make your first deck, which opens the deck editor', async ({
  page,
}) => {
  await createNotebook(page, 'Empty NB', 'First')
  const side = await openSidebar(page)
  await side.getByRole('button', { name: 'All cards', exact: true }).click()
  const empty = main(page).getByTestId('decks-empty')
  await expect(empty).toBeVisible()
  await empty.getByRole('button', { name: 'Make your first deck' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('Audio: an empty list offers Record now', async ({ page }) => {
  await createNotebook(page, 'Audio NB', 'First')
  await page.getByTestId('panel-toggle').click()
  const panel = page.getByTestId('left-panel')
  await panel.getByRole('tab', { name: 'Audio' }).click()
  const empty = panel.getByTestId('audio-empty')
  await expect(empty).toBeVisible()
  await expect(empty.getByRole('button', { name: 'Record now' })).toBeVisible()
})
