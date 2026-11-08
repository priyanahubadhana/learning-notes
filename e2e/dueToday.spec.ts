import { expect, test } from '@playwright/test'
import { closeCorner, createNotebook, makeCard } from './helpers.ts'

/** Polish 2, item 11: "N due · Start" on Home, one tap into the review. */

test('Home shows how many cards are due and Start opens the review', async ({
  page,
}) => {
  await page.goto('/')
  // Nothing due yet: no tile.
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await expect(page.getByTestId('due-tile')).toHaveCount(0)

  await page.locator('[data-space="notebooks"]').click()
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)

  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  const tile = page.getByTestId('due-tile')
  await expect(tile).toContainText('1 due · Start')
  await tile.click()
  await expect(page.getByRole('main')).toContainText(
    'Which valves close in S1?',
  )
})
