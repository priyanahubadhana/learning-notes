import { expect, test, type Page } from '@playwright/test'
import { createNotebook, makeCard, openSidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

test('All cards: search, a notebook filter and a notebook label on each card', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  const side = await openSidebar(page)
  await side.getByRole('button', { name: 'Save & restore' }).click()
  await main(page).getByRole('button', { name: 'Load sample notebook' }).click()
  await side.getByRole('button', { name: 'All cards', exact: true }).click()

  // Every card has a label with its notebook and page.
  await expect(main(page)).toContainText('5 cards')
  await expect(main(page)).toContainText('Sample notebook › Heart sounds')
  await expect(main(page)).toContainText('Cardiology › Heart sounds')

  // Search narrows the list (all words, any case).
  await main(page)
    .getByRole('searchbox', { name: 'Search cards…' })
    .fill('tidal')
  await expect(main(page)).toContainText('1 card')
  await expect(main(page)).toContainText('What is tidal volume?')
  await main(page).getByRole('searchbox', { name: 'Search cards…' }).fill('')

  // The notebook filter sits next to Sort.
  await main(page).getByLabel('Notebook', { exact: true }).selectOption({
    label: 'Cardiology',
  })
  await expect(main(page)).toContainText('1 card')
  await expect(main(page)).not.toContainText('What is tidal volume?')
  await main(page)
    .getByLabel('Notebook', { exact: true })
    .selectOption({ label: 'All notebooks' })
  await expect(main(page)).toContainText('5 cards')
})
