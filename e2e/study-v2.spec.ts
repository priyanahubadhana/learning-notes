import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  makeCard,
  openSidebar,
  selectText,
  slashCommand,
  typeInEditor,
  waitForSaved,
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

// ---- 15b: cards in a page (ST3 to ST6, ST18, ST19) ----

const editorText = (page: Page) => page.locator('.bn-editor')

test('ST3 + ST4: Make card on a selection adds a card under the text; Undo removes it', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'The first heart sound is S1')
  await selectText(page, 'first heart sound')
  await page.getByRole('button', { name: 'Make card', exact: true }).click()
  // The selection is the answer of a new card under the text; the text stays.
  const cards = page.locator('[data-content-type="card"]')
  await expect(cards).toHaveCount(1)
  await expect(editorText(page)).toContainText('The first heart sound is S1')
  await expect(
    page
      .locator('.bn-block-group .bn-block-group')
      .getByText('first heart sound', { exact: true }),
  ).toBeVisible()
  const toast = page.getByText('Card made')
  await expect(toast).toBeVisible()
  // ST4: Undo takes the card away.
  await page.getByRole('button', { name: 'Undo', exact: true }).last().click()
  await expect(cards).toHaveCount(0)
  await expect(editorText(page)).toContainText('The first heart sound is S1')
})

test('ST5 + ST18: "/card" opens the card editor with Question / answer picked (Beginner: 2 types, Professional: 8)', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'Intro')
  await slashCommand(page, 'card')
  const sheet = page.getByTestId('study-card-editor')
  await expect(sheet).toBeVisible()
  const types = sheet.getByTestId('card-types').getByRole('radio')
  await expect(types).toHaveCount(2)
  await expect(
    sheet.getByRole('radio', { name: 'Question / answer' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(sheet.getByRole('radio', { name: 'Blanks' })).toBeVisible()
})

test('ST18: Professional with the unlock sees all 8 card types', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'professional', unlocked: [] }),
    )
  })
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'Intro')
  await slashCommand(page, 'card')
  const sheet = page.getByTestId('study-card-editor')
  await expect(sheet.getByTestId('card-types').getByRole('radio')).toHaveCount(
    8,
  )
})

test('ST6: an old card block shows and reviews as before', async ({ page }) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await expect(
    page.locator('[data-content-type="card"]').first(),
  ).toContainText('Which valves close in S1?')
  await page.reload()
  await expect(page.locator('[data-content-type="card"]')).toHaveCount(1)
  await expect(editorText(page)).toContainText('An answer')
})

test('ST19: "/card list" is Professional; Beginner does not see it', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'Intro')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/card list')
  await expect(
    page.getByText('No matches').or(page.getByText('Card list')),
  ).toBeVisible()
  await expect(page.getByText('Card list', { exact: true })).toHaveCount(0)
})

test('ST19: Professional types "/card list" and gets the Card list block', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'Intro')
  await slashCommand(page, 'card list')
  await expect(page.locator('[data-content-type="cardList"]')).toHaveCount(1)
})

// ---- 15c: Summary and Revise (ST7 to ST9, ST23, ST24) ----

const pageTab = (page: Page, name: string) =>
  page.locator(`[data-page-tab="${name}"]`)

async function oneSummaryLine(page: Page) {
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'The first heart sound is S1')
  await selectText(page, 'first heart sound')
  await page
    .getByRole('button', { name: 'Add to Summary', exact: true })
    .click()
}

test('ST7: Add to Summary makes the Summary tab count glow once', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await oneSummaryLine(page)
  const count = page.getByTestId('tab-count-summary')
  await expect(count).toHaveText('1')
  await expect(count).toHaveAttribute('data-glow', '')
  await expect(count).not.toHaveAttribute('data-glow', '', { timeout: 2500 })
})

test('ST8: the Summary tab shows lines and "In your own words"; typing saves with Saved', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await oneSummaryLine(page)
  await page.waitForTimeout(800)
  await pageTab(page, 'summary').click()
  await expect(page.getByTestId('study-header')).toBeVisible()
  await expect(main(page).locator('[data-summary-line]')).toHaveCount(1)
  const own = main(page).getByLabel('In your own words')
  await own.fill('S1 is the lub')
  await expect(
    main(page).getByRole('status').filter({ hasText: 'Saved' }),
  ).toBeVisible()
})

test('ST9: Revise groups marks by label; "My summary" is one line that opens the Summary field', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'The first heart sound is S1')
  await selectText(page, 'first heart sound')
  await page.getByRole('button', { name: 'Key point', exact: true }).click()
  await waitForSaved(page)
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await tab(page, 'Revise').click()
  const sheet = main(page).getByRole('region', { name: 'Revise' })
  await expect(sheet.getByRole('region', { name: 'Key point' })).toContainText(
    'first heart sound',
  )
  await expect(sheet.getByLabel('My summary')).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Edit in Summary' }).click()
  await expect(pageTab(page, 'summary')).toHaveAttribute('aria-pressed', 'true')
  await expect(main(page).getByLabel('In your own words')).toBeFocused()
})

test('ST23: Professional taps Labels in Revise and edits the labels', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'The first heart sound is S1')
  await selectText(page, 'first heart sound')
  await page.getByRole('button', { name: 'Key point', exact: true }).click()
  await waitForSaved(page)
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await tab(page, 'Revise').click()
  await main(page).getByRole('button', { name: 'Labels', exact: true }).click()
  const sheet = page.getByTestId('revise-labels')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('textbox').first()).toBeVisible()
})

test('ST24: Professional switches the Summary to Notebook and exports it', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await oneSummaryLine(page)
  await page.waitForTimeout(800)
  await pageTab(page, 'summary').click()
  await page.getByTestId('study-header-filter').click()
  await page.getByRole('menuitemradio', { name: 'Notebook' }).click()
  await expect(main(page).locator('[data-summary-line]')).toHaveCount(1)
  await page.getByTestId('study-header-more').click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export' }).click()
  expect((await download).suggestedFilename()).toBe('summary.md')
})
