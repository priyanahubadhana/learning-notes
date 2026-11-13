import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  makeCard,
  openSidebar,
  typeInEditor,
} from './helpers.ts'

/**
 * Study tabs v2 (slice 15, flag `study.v2`), sub-slice 15a: the shared tab
 * header and the Cards tab. One test per line of docs/features/study-v2.md.
 */

const FLAGGED = '/?flags=study.v2'
const main = (page: Page) => page.getByRole('main')
const tab = (page: Page, name: string) =>
  main(page)
    .getByRole('tablist', { name: 'Notebook tabs' })
    .getByRole('tab', { name, exact: true })

async function asLevel(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript((value) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: value, unlocked: [] }),
    )
  }, level)
}

async function openCards(page: Page) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await tab(page, 'Cards').click()
}

test('ST1: the Cards tab lists cards with a status chip and the header shows the count', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await openCards(page)
  const header = page.getByTestId('study-header')
  await expect(header).toBeVisible()
  expect((await header.boundingBox())!.height).toBeGreaterThanOrEqual(52)
  await expect(page.getByTestId('study-header-count')).toHaveText('1')
  const row = main(page).getByRole('button', { name: /Which valves close/ })
  await expect(row).toBeVisible()
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(56)
  const chip = page.getByTestId('card-status')
  await expect(chip).toHaveText('New')
  expect((await chip.boundingBox())!.height).toBe(22)
  // Beginner: Sort is there, Filter waits for its unlock.
  await expect(page.getByTestId('study-header-sort')).toBeVisible()
  await expect(page.getByTestId('study-header-filter')).toHaveCount(0)
})

test('ST2: tapping a card opens the card editor beside the list (Sheet 376 px)', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await openCards(page)
  await main(page)
    .getByRole('button', { name: /Which valves close/ })
    .click()
  const sheet = page.getByTestId('study-card-editor')
  await expect(sheet).toBeVisible()
  // Docks at 376 px from 1024 px wide; narrower, the shared Sheet fills the width.
  const wide = (page.viewportSize()?.width ?? 0) >= 1024
  await expect(async () => {
    const box = (await sheet.boundingBox())!
    if (wide) expect(box.width).toBe(376)
    else expect(box.width).toBeGreaterThan(376)
  }).toPass()
  await expect(sheet.getByLabel('Question')).toHaveValue(
    'Which valves close in S1?',
  )
  await expect(sheet).toContainText('An answer')
  // Typing saves, with visible feedback; the list shows the new text.
  await sheet.getByLabel('Question').fill('Which valves shut in S1?')
  await expect(sheet.getByRole('status')).toHaveText('Saved')
  await page.getByTestId('fb-sheet-close').click()
  await expect(sheet).toHaveCount(0)
  await expect(
    main(page).getByRole('button', { name: /Which valves shut/ }),
  ).toBeVisible()
})

test('ST17: an empty Cards tab says what goes here and has one button', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await openCards(page)
  const empty = page.getByTestId('cards-empty')
  await expect(empty).toContainText('No cards yet')
  await expect(empty.getByRole('button')).toHaveCount(1)
  await empty.getByRole('button', { name: 'Make your first card' }).click()
  await expect(page).toHaveURL(/#\/page\//)
})

test('ST20: Filter by status shows a chip with ✕ that clears it (Professional)', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await openCards(page)
  const rows = main(page).getByRole('button', { name: /Which valves close/ })
  await expect(rows).toHaveCount(1)
  await page.getByTestId('study-header-filter').click()
  await page.getByRole('menuitemradio', { name: 'Paused' }).click()
  await expect(rows).toHaveCount(0)
  await expect(page.getByTestId('cards-empty')).toContainText(
    'No cards match this filter',
  )
  await page.getByRole('button', { name: 'Remove filter Paused' }).click()
  await expect(rows).toHaveCount(1)
})

test('flag off: the Cards tab is today’s', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'x')
  await openCards(page)
  await expect(page.getByTestId('study-header')).toHaveCount(0)
})
