import { expect, test, type Page } from '@playwright/test'
import { createNotebook, makeCard, openSidebar, pageAction } from './helpers.ts'

/** E1: decks in three steps, Study, Pause and the Paused list. */

const main = (page: Page) => page.getByRole('main')
const dialog = (page: Page) => page.getByRole('dialog')

async function openAllCards(page: Page) {
  const side = await openSidebar(page)
  await side.getByRole('button', { name: 'All cards', exact: true }).click()
  await expect(main(page).getByRole('heading', { name: 'Decks' })).toBeVisible()
}

test('make a deck in three steps, see its numbers, study it, change and delete it', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await openAllCards(page)

  // The default deck is there with its three numbers.
  const all = main(page).locator('[data-deck-tile="All cards"]')
  await expect(all.locator('[data-count="new"]')).toHaveText('1')

  await main(page).getByRole('button', { name: 'New deck' }).click()
  const d = dialog(page)
  // Step 1: Where. Tick the notebook.
  await d.getByRole('checkbox', { name: 'Cardiology' }).check()
  await expect(d.locator('[data-deck-match]')).toHaveText('1 card matches')
  await d.getByRole('button', { name: 'Next' }).click()
  // Step 2: Which cards (states).
  await d.getByRole('button', { name: 'Due', exact: true }).click()
  await expect(d.locator('[data-deck-match]')).toHaveText('0 cards match')
  await d.getByRole('button', { name: 'New', exact: true }).click()
  await d.getByRole('button', { name: 'Due', exact: true }).click()
  await expect(d.locator('[data-deck-match]')).toHaveText('1 card matches')
  await d.getByRole('button', { name: 'Next' }).click()
  // Step 3: Name.
  await d.getByLabel('Deck name').fill('Heart')
  await d.getByRole('button', { name: 'Create deck' }).click()

  const tile = main(page).locator('[data-deck-tile="Heart"]')
  await expect(tile.locator('[data-count="new"]')).toHaveText('1')
  await expect(tile.locator('[data-count="learning"]')).toHaveText('0')
  await expect(tile.locator('[data-count="due"]')).toHaveText('0')

  // Study it.
  await tile.getByRole('button', { name: 'Study Heart' }).click()
  await expect(
    page.getByRole('heading', { name: 'Review · Heart' }),
  ).toBeVisible()
  await expect(
    page.getByText('Which valves close in S1?').first(),
  ).toBeVisible()

  // Back to the decks; edit the name; delete it.
  await page.goBack()
  await openAllCards(page)
  await main(page).getByRole('button', { name: 'Edit Heart' }).click()
  await dialog(page).getByRole('button', { name: 'Next' }).click()
  await dialog(page).getByRole('button', { name: 'Next' }).click()
  await dialog(page).getByLabel('Deck name').fill('Heart sounds')
  await dialog(page).getByRole('button', { name: 'Save' }).click()
  await expect(
    main(page).locator('[data-deck-tile="Heart sounds"]'),
  ).toBeVisible()
  await main(page).getByRole('button', { name: 'Delete Heart sounds' }).click()
  await dialog(page).getByRole('button', { name: 'Delete deck' }).click()
  await expect(
    main(page).locator('[data-deck-tile="Heart sounds"]'),
  ).toHaveCount(0)
  // The notes and cards are untouched.
  await expect(all.locator('[data-count="new"]')).toHaveText('1')
})

test('pause a page: its cards leave reviews and the Paused list resumes them', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await pageAction(page, 'Pause reviews')
  await openAllCards(page)

  const all = main(page).locator('[data-deck-tile="All cards"]')
  await expect(all.locator('[data-count="new"]')).toHaveText('0')
  const paused = main(page).locator('[data-paused-list]')
  await expect(paused).toContainText('Heart sounds')
  await paused.getByRole('button', { name: 'Resume Heart sounds' }).click()
  await expect(all.locator('[data-count="new"]')).toHaveText('1')
  await expect(paused).toHaveCount(0)
})

test('a saved search becomes a deck', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  // Save a card search through the Search screen.
  await page.evaluate(async () => {
    const open = indexedDB.open('learning-notes')
    await new Promise<void>((resolve, reject) => {
      open.onsuccess = () => {
        const tx = open.result.transaction('savedSearches', 'readwrite')
        tx.objectStore('savedSearches').put({
          id: 's1',
          name: 'Valves',
          query: { text: 'valves', type: 'card', filters: {} },
          order: 'a0',
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
      open.onerror = () => reject(open.error)
    })
  })
  await page.reload()
  await openAllCards(page)
  await main(page).getByRole('button', { name: 'Make decks' }).click()
  await expect(main(page).locator('[data-deck-tile="Valves"]')).toBeVisible()
  await expect(
    main(page).getByRole('button', { name: 'Make decks' }),
  ).toHaveCount(0)
})
