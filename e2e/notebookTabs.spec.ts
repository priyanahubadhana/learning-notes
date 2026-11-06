import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  makeCard,
  openSidebar,
  setTheme,
} from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const tabs = (page: Page) =>
  main(page).getByRole('tablist', { name: 'Notebook tabs' })
const tab = (page: Page, name: string) =>
  tabs(page).getByRole('tab', { name, exact: true })

/** Opens a notebook's tabs by clicking its name in the sidebar. */
async function openNotebook(page: Page, name: string) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name, exact: true })
    .click()
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText(name)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

test('notebook opens on Notes; tabs switch by click and arrow keys', async ({
  page,
}) => {
  await addPage(page, 'Heart sounds', 'S1 and S2', 'sub-page')
  await openNotebook(page, 'Cardiology')
  await expect(tabs(page).getByRole('tab')).toHaveText([
    'Notes',
    'Database',
    'Cards',
    'Revise',
  ])
  await expect(tab(page, 'Notes')).toHaveAttribute('aria-selected', 'true')
  const notes = main(page).getByRole('region', { name: 'Notes' })
  await expect(
    notes.getByRole('button', { name: /Heart sounds/ }),
  ).toContainText('1 sub-page')

  // Keyboard: → moves to Database, End to Revise, Home back to Notes.
  await tab(page, 'Notes').focus()
  await page.keyboard.press('ArrowRight')
  await expect(tab(page, 'Database')).toBeFocused()
  await expect(tab(page, 'Database')).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(tab(page, 'Revise')).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(tab(page, 'Notes')).toHaveAttribute('aria-selected', 'true')

  // A page opens from the Notes tab; the tab is remembered.
  await tab(page, 'Database').click()
  await openNotebook(page, 'Cardiology')
  await expect(tab(page, 'Database')).toHaveAttribute('aria-selected', 'true')
  await tab(page, 'Notes').click()
  await notes.getByRole('button', { name: /Heart sounds/ }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Heart sounds',
  )
})

test('Database tab: the Study tracker lists each lesson', async ({ page }) => {
  await addPage(page, 'Cardiology', 'ECG basics')
  await openNotebook(page, 'Cardiology')
  await tab(page, 'Database').click()
  const tracker = main(page).getByRole('region', { name: 'Study tracker' })
  // With lessons in it, the tracker opens on its Dashboard.
  await expect(
    tracker.getByRole('button', { name: 'Dashboard' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await tracker.getByRole('button', { name: 'Table' }).click()
  const headers = tracker.getByRole('columnheader')
  await expect(headers.first()).toContainText('Lesson')
  await expect(
    tracker.getByRole('columnheader', { name: /Status/ }),
  ).toContainText('auto')
  await expect(tracker.getByRole('rowheader')).toHaveText([
    /^Heart sounds/,
    /^ECG basics/,
  ])
  await tracker.getByRole('button', { name: 'Open “ECG basics”' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'ECG basics',
  )
})

test('Cards tab: lists the cards, sorts, and starts Review', async ({
  page,
}) => {
  await makeCard(page, 'What closes to make S1?', 1)
  await openNotebook(page, 'Cardiology')
  await tab(page, 'Cards').click()
  const cards = main(page).getByRole('region', { name: 'Cards' })
  await expect(cards.getByRole('heading')).toContainText('1 card')
  await expect(cards.getByRole('listitem')).toHaveCount(1)
  await expect(cards.getByRole('listitem')).toContainText(
    'What closes to make S1?',
  )

  await cards.getByRole('button', { name: /^Sort: Due first/ }).click()
  await page.getByRole('menuitem', { name: 'Most failed' }).click()
  await expect(
    cards.getByRole('button', { name: /^Sort: Most failed/ }),
  ).toBeVisible()

  await cards.getByRole('button', { name: 'Review 1 due' }).click()
  await expect(main(page)).toContainText('What closes to make S1?')
  await expect(tabs(page)).toHaveCount(0)
})

test('tabs can be renamed, hidden and shown again', async ({ page }) => {
  await openNotebook(page, 'Cardiology')
  await tab(page, 'Cards').click()
  const options = main(page).getByRole('button', { name: 'Tab options' })

  await options.click()
  await page.getByRole('menuitem', { name: 'Rename “Cards”' }).click()
  const dialog = page.getByRole('dialog', { name: 'Rename tab' })
  await dialog.getByRole('textbox').fill('Flashcards')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(tab(page, 'Flashcards')).toHaveAttribute('aria-selected', 'true')

  await options.click()
  await page.getByRole('menuitem', { name: 'Hide “Flashcards”' }).click()
  await expect(tabs(page).getByRole('tab')).toHaveText([
    'Notes',
    'Database',
    'Revise',
  ])

  await options.click()
  await page.getByRole('menuitem', { name: 'Show “Flashcards”' }).click()
  await expect(tab(page, 'Flashcards')).toHaveAttribute('aria-selected', 'true')

  // Empty name = the default name again.
  await options.click()
  await page.getByRole('menuitem', { name: 'Rename “Flashcards”' }).click()
  await dialog.getByRole('textbox').fill('')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(tab(page, 'Cards')).toBeVisible()
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
  ['Night', 844, 390],
] as const) {
  test(`screenshot: ${theme} ${width}×${height}`, async ({ page }) => {
    await addPage(page, 'Cardiology', 'ECG basics')
    await setTheme(page, theme)
    await page.setViewportSize({ width, height })
    await openNotebook(page, 'Cardiology')
    await tab(page, 'Database').click()
    await main(page).getByRole('button', { name: 'Table', exact: true }).click()
    await expect(main(page).getByRole('rowheader')).toHaveCount(2)
    // The tabs fit on screen, also on a phone.
    const box = await tabs(page).boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/notebook-${theme}-${width}x${height}.png`,
    })
  })
}
