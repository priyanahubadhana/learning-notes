import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  makeCard,
  openSidebar,
  cornerAction,
  openMore,
  selectionAction,
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
  await selectionAction(page, 'first heart sound', 'Make card')
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
  await selectionAction(page, 'first heart sound', 'Add to Summary')
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
  await selectionAction(page, 'first heart sound', 'Key point')
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
  await selectionAction(page, 'first heart sound', 'Key point')
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
  const name = sheet.getByRole('textbox').first()
  await expect(name).toBeVisible()
  const before = await name.inputValue()
  await name.fill('Core idea')
  await name.blur()
  await expect(name).toHaveValue('Core idea')
  // Undo gives the old name back; Redo takes it again.
  await sheet.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(name).toHaveValue(before)
  await sheet.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(name).toHaveValue('Core idea')
})

test('ST24: Professional switches the Summary to Notebook and exports it', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await oneSummaryLine(page)
  await page.waitForTimeout(800)
  await pageTab(page, 'summary').click()
  // The touch selection bar goes with the notes (it covered this header).
  await expect(page.locator('[data-mini-toolbar]')).toHaveCount(0)
  await page.getByTestId('study-header-filter').click()
  await page.getByRole('menuitemradio', { name: 'Notebook' }).click()
  await expect(main(page).locator('[data-summary-line]')).toHaveCount(1)
  await page.getByTestId('study-header-more').click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export' }).click()
  expect((await download).suggestedFilename()).toBe('summary.md')
})

// ---- 15d: page Review tab and Review home (ST10, ST11) ----

test('ST10: the page Review tab shows Due, New and Learned and one Practise button', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await waitForSaved(page)
  await pageTab(page, 'review').click()
  await expect(page.getByTestId('rv-due')).toContainText('Due')
  await expect(page.getByTestId('rv-new')).toContainText('1')
  await expect(page.getByTestId('rv-learned')).toContainText('Learned')
  await expect(
    main(page).getByRole('button', { name: 'Practise', exact: true }),
  ).toHaveCount(1)
})

test('ST11: sidebar "All cards" opens the Review hub (Notes, Summary, Review) with Browse', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'All cards', exact: true })
    .click()
  const segments = main(page).getByRole('group', { name: 'Page views' })
  await expect(segments).toBeVisible()
  await expect(
    segments.getByRole('button', { name: 'Review' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('study-header')).toContainText('Browse')
  await expect(
    main(page).getByRole('button', { name: /Which valves close/ }),
  ).toBeVisible()
})

// ---- 15e: Slides and Memory helpers (ST25, ST26), 15g Anki entry (ST29) ----

async function pptxDeck(page: Page) {
  const { zipSync, strToU8 } = await import('fflate')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const rel = (n: string) =>
    strToU8(
      `<Relationships><Relationship Id="r1" Target="../media/${n}"/></Relationships>`,
    )
  const pptx = Buffer.from(
    zipSync({
      'ppt/slides/_rels/slide1.xml.rels': rel('a.png'),
      'ppt/slides/_rels/slide2.xml.rels': rel('b.png'),
      'ppt/media/a.png': new Uint8Array(png),
      'ppt/media/b.png': new Uint8Array(png),
    }),
  )
  await createNotebook(page, 'Mine', 'First')
  await cornerAction(page, 'Save & restore')
  await openMore(page)
  const nlm = main(page).getByRole('region', {
    name: 'Bring in from NotebookLM',
  })
  await nlm.getByLabel('Choose a file').setInputFiles({
    name: 'deck.pptx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    buffer: pptx,
  })
  await nlm.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(/Added to /)).toBeVisible()
  await page.getByRole('button', { name: 'From NotebookLM' }).first().click()
}

test('ST25: Slides stays off until unlocked; then present full screen, swipe, theme, save', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await pptxDeck(page)
  await page.locator('[data-page-tabs-menu]').click()
  await page.getByText('Slides', { exact: true }).click()
  await page.keyboard.press('Escape')
  await pageTab(page, 'slides').click()
  await expect(page.locator('[data-slide]')).toHaveCount(2)
  await main(page).getByRole('button', { name: 'Present' }).click()
  const present = page.getByTestId('slides-present')
  await expect(present).toBeVisible()
  await expect(present.getByRole('status')).toHaveText('Slide 1 of 2')
  // Swipe left: the next slide.
  const box = (await page.getByTestId('present-slide').boundingBox())!
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 4 })
  await page.mouse.up()
  await expect(present.getByRole('status')).toHaveText('Slide 2 of 2')
  await present.getByRole('button', { name: /^Theme/ }).click()
  await present.getByRole('radio', { name: 'Sepia' }).click()
  await expect(present).toHaveAttribute('data-theme-slides', 'sepia')
  const download = page.waitForEvent('download')
  await present
    .getByRole('button', { name: 'Save the file', exact: true })
    .click()
  await download
  await present.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(present).toHaveCount(0)
})

test('ST25: Beginner has no Slides tab in the tab menu', async ({ page }) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Mine', 'First')
  await page.locator('[data-page-tabs-menu]').click()
  await expect(page.getByText('Slides', { exact: true })).toHaveCount(0)
})

test('ST26 + ST29: Professional finds Memory helpers and Anki in Cards "⋯"', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await waitForSaved(page)
  await openCards(page)
  await page.getByTestId('study-header-more').click()
  await expect(
    page.getByRole('menuitem', { name: 'Import from Anki' }),
  ).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Save for Anki' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.apkg$/)
  await page.getByTestId('study-header-more').click()
  await page.getByRole('menuitem', { name: 'Memory helpers' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('ST26 + ST29: Beginner has no "⋯" with Memory helpers or Anki', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await openCards(page)
  await expect(page.getByTestId('study-header-more')).toHaveCount(0)
})

// ---- 15g: Capture and journal stay as they are with the flag on (ST15, ST16, ST28) ----

test('ST16: Today opens today’s journal page, with the flag on', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    /\d{4}/,
  )
  await expect(page.locator('.bn-editor')).toContainText('Today I learned')
})

test('ST15: Capture takes a pasted link and keeps a YouTube start time', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto('/?flags=study.v2#/capture')
  await expect(page.getByTestId('capture-url')).toBeVisible()
  // Beginner: pasting a link only; the other ways in are Professional (ST28).
  await expect(page.getByTestId('notes-panel')).toHaveCount(0)
  await expect(page.getByTestId('capture-address')).toHaveCount(0)
  await page
    .getByTestId('capture-url')
    .fill('https://youtu.be/dQw4w9WgXcQ?t=90')
  await expect(page.getByTestId('capture-url')).toHaveValue(/t=90/)
})

// ---- 15h: saved filters and the card strip (ST21, ST22) ----

test('ST21: Save filter adds a chip in the header; ✕ removes it with Undo', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await openCards(page)
  await page.getByTestId('study-header-filter').click()
  await page.getByRole('menuitemradio', { name: 'New' }).click()
  await page.getByTestId('study-header-filter').click()
  await page.getByRole('menuitem', { name: 'Save filter' }).click()
  // The active chip and the saved chip both show.
  // The saved chip comes first; the live filter's chip is the last one.
  await page.getByRole('button', { name: 'Remove filter New' }).last().click()
  const saved = page.getByTestId('study-header').getByRole('button', {
    name: 'New',
    exact: true,
  })
  await expect(saved).toBeVisible()
  await page.getByRole('button', { name: 'Remove filter New' }).click()
  await expect(saved).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(saved).toBeVisible()
})

test('ST22: a long press on a card row offers Pause / Resume and Open note', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await openCards(page)
  const row = main(page).getByRole('button', { name: /Which valves close/ })
  await row.dispatchEvent('contextmenu')
  const strip = page.getByTestId('card-strip')
  await expect(strip).toBeVisible()
  await expect(strip.getByRole('menuitem', { name: 'Open note' })).toBeVisible()
  await strip.getByRole('menuitem', { name: 'Pause' }).click()
  await expect(page.getByTestId('card-status')).toHaveText('Paused')
  await row.dispatchEvent('contextmenu')
  await page
    .getByTestId('card-strip')
    .getByRole('menuitem', { name: 'Resume' })
    .click()
  await expect(page.getByTestId('card-status')).toHaveText('New')
})

test('ST22: Beginner has no card strip', async ({ page }) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  await openCards(page)
  await main(page)
    .getByRole('button', { name: /Which valves close/ })
    .dispatchEvent('contextmenu')
  await expect(page.getByTestId('card-strip')).toHaveCount(0)
})

test('ST28: Professional finds the bookmarklet, the iOS Shortcut and Notes from your own AI', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto('/?flags=study.v2#/capture')
  await expect(page.getByTestId('capture-url')).toBeVisible()
  await expect(page.getByTestId('notes-panel')).toBeVisible()
  await expect(page.getByTestId('capture-address')).toBeVisible()
  await expect(page.getByText('Send to Learning Notes')).toBeVisible()
})
