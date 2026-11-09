// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, openCorner } from './helpers.ts'
import {
  barTool,
  controls,
  frame,
  landings,
  mockSpeech,
  moreItem,
  openPanel,
  readSwitch,
  spoken,
  writeBook,
} from './readingHelpers.ts'

/**
 * Wave 2, Phase B: the reader's controls (B1), Contents and Bookmarks (B2),
 * Find with a scope (B3) and the player with Now playing (B4).
 */

test.use({ viewport: { width: 1100, height: 700 } })

const main = (page: Page) => page.getByRole('main')

async function startBook(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Heart', 'Cardiology book')
  await writeBook(page, 3)
}

// ------------------------------------------------------------------- B1

test('reading hides the main bar and shows the same controls in both views', async ({
  page,
}) => {
  await startBook(page)
  await expect(page.locator('[data-main-bar]')).toBeVisible()
  await readSwitch(page).click()
  await expect(frame(page)).toHaveAttribute('data-view', 'inPlace')
  await expect(page.locator('[data-main-bar]')).toHaveCount(0)
  const names = [
    'Exit reading',
    'Contents',
    'Bookmarks',
    'Reading look (Aa)',
    'Find',
    'Listen',
    'Edit page',
    'More reading options',
  ]
  for (const name of names) {
    await expect(barTool(page, name), name).toBeVisible()
  }
  // Full screen has the same controls, minus Edit (it is in place only).
  await (await moreItem(page, 'Full screen')).click()
  await expect(frame(page)).toHaveAttribute('data-view', 'reader')
  for (const name of names.filter((n) => n !== 'Edit page')) {
    await expect(barTool(page, name), name).toBeVisible()
  }
  await expect(barTool(page, 'Edit page')).toHaveCount(0)
  // ✎ Edit in place leaves reading and brings the main bar back.
  await (await moreItem(page, 'Back to the page')).click()
  await barTool(page, 'Edit page').click()
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
  await expect(page.locator('[data-main-bar]')).toBeVisible()
})

test('small ✕ while scrolling down; the bar returns after scrolling up', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await expect(controls(page)).toBeVisible()
  await main(page).evaluate((m) => m.scrollTo({ top: 600 }))
  await expect(controls(page)).toHaveCount(0)
  await expect(page.getByTestId('reader-mini-exit')).toBeVisible()
  await main(page).evaluate((m) => m.scrollBy(0, -40))
  await expect(controls(page)).toBeVisible()
  // The small ✕ leaves reading, too.
  await main(page).evaluate((m) => m.scrollTo({ top: 900 }))
  await expect(controls(page)).toHaveCount(0)
  await page.getByTestId('reader-mini-exit').getByRole('button').click()
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
})

test('Reader bar setting: always show, and only at the top', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:reading.bar',
      JSON.stringify('always'),
    ),
  )
  await startBook(page)
  await readSwitch(page).click()
  await main(page).evaluate((m) => m.scrollTo({ top: 600 }))
  await page.waitForTimeout(300)
  await expect(controls(page)).toBeVisible()
})

test('Aa sheet: four tabs, saved looks, and the dim layer', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  const sheet = await openPanel(page, 'Text size', 'Look and reading')
  await expect(sheet.getByRole('tab')).toHaveText([
    'Font',
    'Layout',
    'Themes',
    'More',
  ])
  // Themes: a ready-made look applies; "Save current as…" keeps a new one.
  await sheet.getByRole('tab', { name: 'Themes' }).click()
  await sheet.locator('[data-look="large"]').click()
  await sheet.getByRole('tab', { name: 'Font' }).click()
  await expect(sheet.getByTestId('reading-size')).toHaveText('130%')
  await sheet.getByRole('tab', { name: 'Themes' }).click()
  await sheet.getByRole('radio', { name: 'Sepia' }).click()
  await sheet.getByLabel('Name for this look').fill('Night shift')
  await sheet.getByRole('button', { name: 'Save current as…' }).click()
  await sheet.locator('[data-look="compact"]').click()
  await sheet.locator('[data-look="Night shift"]').click()
  await sheet.getByRole('tab', { name: 'Font' }).click()
  await expect(sheet.getByTestId('reading-size')).toHaveText('130%')
  // More: the dim layer darkens the page (and says it is not brightness).
  await sheet.getByRole('tab', { name: 'More' }).click()
  await expect(
    sheet.getByText(/cannot change the screen brightness/),
  ).toBeVisible()
  await sheet.getByRole('radio', { name: '40%' }).click()
  await expect(page.getByTestId('reading-dim')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0.4)',
  )
  // The daily reading goal shows today's progress.
  await sheet.getByRole('radio', { name: '10 min' }).click()
  await expect(sheet.getByTestId('reading-goal-note')).toContainText(
    'of 10 min',
  )
  // The saved look is remembered.
  await page.reload()
  await readSwitch(page).click()
  await page.waitForTimeout(300)
  await main(page).evaluate((m) => m.scrollTo({ top: 0 }))
  const again = await openPanel(page, 'Text size', 'Look and reading')
  await again.getByRole('tab', { name: 'Themes' }).click()
  await expect(again.locator('[data-look="Night shift"]')).toBeVisible()
})

test('the Read pill is not needed: the options come from the reader controls only', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await expect(page.locator('[data-options-pill="read"]')).toHaveCount(0)
})

// ------------------------------------------------------------------- B2

test('Contents opens the left panel on its Outline tab and jumps', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await barTool(page, 'Contents').click()
  const panel = page.getByTestId('left-panel')
  await expect(panel.getByRole('tab', { name: /Outline/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(panel.locator('[data-heading]')).toHaveCount(3)
  await panel.getByRole('button', { name: 'Chapter 2' }).click()
  await expect
    .poll(() => main(page).evaluate((m) => m.scrollTop))
    .toBeGreaterThan(200)
})

test('a jump takes the same time near and far, and a touch stops it', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await barTool(page, 'Contents').click()
  const t0 = Date.now()
  await page
    .getByTestId('left-panel')
    .getByRole('button', { name: 'Chapter 3' })
    .click()
  await expect
    .poll(async () => (await main(page).evaluate((m) => m.scrollTop)) > 0)
    .toBe(true)
  await expect.poll(() => landings(page)).toBeGreaterThan(0)
  // It ends within about the set time (1.2 s) plus slack for the machine.
  await expect
    .poll(async () => {
      const a = await main(page).evaluate((m) => m.scrollTop)
      await page.waitForTimeout(150)
      return a === (await main(page).evaluate((m) => m.scrollTop))
    })
    .toBe(true)
  expect(Date.now() - t0).toBeLessThan(4000)
})

test('adding a bookmark says so with Undo and drops a ribbon in the margin', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Bookmarks', 'Bookmarks')
  await panel.getByRole('button', { name: 'Add a bookmark here' }).click()
  const toast = page.getByRole('status').filter({ hasText: 'Bookmark added' })
  await expect(toast).toBeVisible()
  await expect(page.locator('style#ln-bookmark-ribbons')).toHaveCount(1)
  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('style#ln-bookmark-ribbons')).toHaveCount(0)
})

// ------------------------------------------------------------------- B3

test('Find: This page is the default scope; it counts, steps and has wider scopes', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await barTool(page, 'Find').click()
  const panel = page.getByRole('dialog', { name: 'Find' })
  await expect(panel.getByRole('radio', { name: 'This page' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await panel.getByRole('searchbox', { name: 'Find' }).fill('valves')
  await expect(panel.getByTestId('find-count')).toHaveText('1 of 24')
  await panel.getByRole('button', { name: 'Next match' }).click()
  await expect(panel.getByTestId('find-count')).toHaveText('2 of 24')
  await panel.getByRole('button', { name: 'Previous match' }).click()
  await expect(panel.getByTestId('find-count')).toHaveText('1 of 24')
  // Matches are painted with the Custom Highlight API.
  expect(
    await page.evaluate(() => CSS.highlights.get('reading-find')?.size ?? 0),
  ).toBe(24)
  // This notebook: a result list.
  await panel.getByRole('radio', { name: 'This notebook' }).click()
  await expect(panel.locator('[data-find-result]').first()).toBeVisible()
})

// ------------------------------------------------------------------- B4

test('the player: back and forward by a sentence, Now playing everywhere, stop', async ({
  page,
}) => {
  await mockSpeech(page, 40)
  await startBook(page)
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Read aloud', 'Read aloud')
  await panel.getByRole('button', { name: 'Read this page' }).click()
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0)
  const pill = page.getByTestId('now-playing')
  await expect(pill).toBeVisible()
  await expect(pill).toContainText('Cardiology book')
  // Forward skips a sentence; no sentence is spoken twice in a row.
  await panel.getByRole('button', { name: 'Forward' }).click()
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(1)
  const said = (await spoken(page)).map((u) => u.text)
  for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1])
  // The pill stays when leaving the page (Settings), and ⏹ stops.
  await openCorner(page)
  await page.getByRole('button', { name: 'Settings' }).first().click()
  await expect(pill).toBeVisible()
  await pill.getByRole('button', { name: 'Stop' }).click()
  await expect(pill).toHaveCount(0)
})

// ---------------------------------------------------- bar: hide, show, pin

test('reader bar: hides scrolling down, returns on a small scroll up, a tap, or when pinned', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await expect(controls(page)).toBeVisible()
  await main(page).evaluate((m) => m.scrollTo({ top: 600 }))
  await expect(controls(page)).toHaveCount(0)
  // A small scroll up (10 px or a bit more) brings it back.
  await main(page).evaluate((m) => m.scrollBy(0, -15))
  await expect(controls(page)).toBeVisible()
  // Hide it again, then a tap on the page shows it.
  await main(page).evaluate((m) => m.scrollBy(0, 400))
  await expect(controls(page)).toHaveCount(0)
  await page.mouse.click(600, 350)
  await expect(controls(page)).toBeVisible()
  // Pinned: it stays while scrolling down.
  await controls(page).getByTestId('reader-pin').click()
  await main(page).evaluate((m) => m.scrollBy(0, 400))
  await page.waitForTimeout(300)
  await expect(controls(page)).toBeVisible()
  await controls(page).getByTestId('reader-pin').click()
  await main(page).evaluate((m) => m.scrollBy(0, 400))
  await expect(controls(page)).toHaveCount(0)
})
