import { expect, test } from '@playwright/test'
import { dockedBar } from './helpers.ts'
import {
  barMenu,
  card,
  mainBar,
  openNote,
  openPill,
  option,
  pill,
  tool,
} from './mainBarHelpers.ts'

/**
 * The new main bar (redesign step 2): one solid, icon-only row; the selected
 * tool is the mode; Undo and Redo in their own pill; the ⋯ menu with Edit bar
 * first and All tools next. The Write · Draw · Read switch is gone.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const TOOLS = [
  'Text',
  'Pen',
  'Highlighter',
  'Eraser',
  'New line',
  'Backspace',
  'Lasso',
  'Insert',
  'Read',
]

test('the bar has Undo, Redo, the nine tools in order and ⋯; no switch', async ({
  page,
}) => {
  await openNote(page)
  const bar = mainBar(page)
  await expect(bar).toBeVisible()
  const names = await bar
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(names).toEqual([
    'Undo',
    'Redo',
    ...TOOLS,
    'Keyboard',
    'Mini keyboard',
    'Toolbar menu',
  ])
  // The Write · Draw · Read switch and its pin are gone.
  await expect(dockedBar(page).getByRole('radiogroup')).toHaveCount(0)
  await expect(
    dockedBar(page).getByRole('radio', { name: 'Draw' }),
  ).toHaveCount(0)
  await expect(page.locator('[data-set-keep]')).toHaveCount(0)
})

test('every control is icon-only and at least 44 px', async ({ page }) => {
  await openNote(page)
  for (const button of await mainBar(page).getByRole('button').all()) {
    const name = await button.getAttribute('aria-label')
    const box = (await button.boundingBox())!
    expect(box.width, name!).toBeGreaterThanOrEqual(43.5)
    expect(box.height, name!).toBeGreaterThanOrEqual(43.5)
    // Icon only: an SVG and no visible words.
    await expect(button.locator('svg').first()).toBeVisible()
    expect((await button.innerText()).trim(), name!).toBe('')
  }
})

test('Undo and Redo sit in their own small pill', async ({ page }) => {
  await openNote(page)
  const history = mainBar(page).getByRole('group', { name: 'Undo and Redo' })
  await expect(history.getByRole('button')).toHaveCount(2)
  await expect(tool(page, 'Undo')).toBeEnabled()
  await tool(page, 'Undo').click()
  await expect(tool(page, 'Redo')).toBeEnabled()
})

test('the selected tool is the mode, and it opens its own pill', async ({
  page,
}) => {
  await openNote(page)
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await expect(pill(page)).toHaveCount(0) // a pill opens when a tool is tapped
  await tool(page, 'Pen').click()
  await expect(tool(page, 'Pen')).toHaveAttribute('aria-pressed', 'true')
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'false')
  await expect(pill(page, 'pen')).toBeVisible()
  await tool(page, 'Eraser').click()
  await expect(pill(page, 'eraser')).toBeVisible()
  await expect(pill(page)).toHaveCount(1)
  // Tapping the open tool again closes its pill; the tool stays the mode.
  await tool(page, 'Eraser').click()
  await expect(pill(page)).toHaveCount(0)
  await expect(tool(page, 'Eraser')).toHaveAttribute('aria-pressed', 'true')
  // Insert opens a pill without becoming the mode.
  await tool(page, 'Insert').click()
  await expect(pill(page, 'insert')).toBeVisible()
  await expect(tool(page, 'Eraser')).toHaveAttribute('aria-pressed', 'true')
  await expect(tool(page, 'Insert')).not.toHaveAttribute('aria-pressed', /.+/)
})

test('the pill follows the pop-up rule: a tap outside, Esc, the ✕; the pin keeps it', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  await page.keyboard.press('Escape')
  await expect(pill(page)).toHaveCount(0)
  await openPill(page, 'Text', 'text')
  await page.locator('[data-pill-close]').click()
  await expect(pill(page)).toHaveCount(0)
  await openPill(page, 'Pen', 'pen')
  await page
    .locator('[data-page-scroller]')
    .click({ position: { x: 4, y: 300 }, force: true })
  await expect(pill(page)).toHaveCount(0)
  // Pinned: it stays through a tap in the page, until it is unpinned.
  await openPill(page, 'Pen', 'pen')
  await page.locator('[data-pill-pin]').click()
  await expect(page.locator('[data-pill-pin]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page
    .locator('[data-page-scroller]')
    .click({ position: { x: 4, y: 300 }, force: true })
  await expect(pill(page, 'pen')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(pill(page, 'pen')).toBeVisible()
  await page.locator('[data-pill-close]').click() // ✕ also unpins
  await expect(pill(page)).toHaveCount(0)
})

test('Aa options: style, B I U, colours, list, alignment, key point', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  const names = await pill(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(names.slice(1, 10)).toEqual([
    expect.stringMatching(/^Text style/),
    'Bold',
    'Italic',
    'Underline',
    expect.stringMatching(/^Text colour/),
    'Choose a text colour',
    expect.stringMatching(/^Highlight colour/),
    'Choose a highlight colour',
    'List',
  ])
  await page.keyboard.press('Control+a')
  await option(page, 'Bold').click()
  await expect(page.locator('.bn-editor strong')).toHaveCount(1)
  await expect(option(page, 'Bold')).toHaveAttribute('aria-pressed', 'true')
  await option(page, 'Italic').click()
  await option(page, 'Underline').click()
  await expect(page.locator('.bn-editor em')).toHaveCount(1)
  await expect(page.locator('.bn-editor u')).toHaveCount(1)
  await option(page, /^Highlight colour/).click()
  await expect(
    page.locator('.bn-editor [data-style-type="backgroundColor"]'),
  ).toHaveCount(1)
  await option(page, /^Text colour/).click()
  await expect(
    page.locator('.bn-editor [data-style-type="textColor"][data-value="red"]'),
  ).toHaveCount(1)
  await option(page, 'Key point').click()
  await expect(
    page.locator('.bn-editor .recall-mark[data-mark="key"]'),
  ).toHaveCount(1)
})

test('Aa › Style card: Title, Heading, Body, font, size, line height; sub-pages with ‹ back', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  await option(page, /^Text style/).click()
  const c = card(page)
  await expect(c).toBeVisible()
  await expect(c.getByRole('radio')).toHaveText([
    'Title',
    'Heading 1',
    'Heading 2',
    'Heading 3',
    'Body',
    '90%',
    '100%',
    '115%',
    '130%',
    '150%',
    'Normal',
    'Tight',
    'Loose',
  ])
  await c.getByRole('radio', { name: 'Heading 2' }).click()
  await expect(page.locator('.bn-editor h2')).toHaveCount(1)
  await expect(option(page, /^Text style: Heading 2/)).toBeVisible()
  await c.getByRole('radio', { name: 'Body' }).click()
  await expect(page.locator('.bn-editor h2')).toHaveCount(0)
  // Strikethrough, Code and Link are in the card.
  await expect(c.getByRole('switch', { name: 'Strikethrough' })).toBeVisible()
  await expect(c.getByRole('switch', { name: 'Code' })).toBeVisible()
  await expect(c.getByRole('button', { name: 'Link…' })).toBeVisible()
  // Size and line height.
  await c.getByRole('radio', { name: '130%' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-note-size', '')
  await c.getByRole('radio', { name: 'Loose' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-note-line', '')
  // Sub-page: Font, and back.
  await c.getByRole('button', { name: /^Font/ }).click()
  await expect(c.getByRole('group', { name: 'Font' })).toBeVisible()
  await c.getByRole('radio', { name: 'Literata' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-note-font', '')
  await c.getByRole('button', { name: 'Back' }).click()
  await expect(c.getByRole('group', { name: 'Text style' })).toBeVisible()
  // Sub-page: Text-box style.
  await c.getByRole('button', { name: /^Text-box style/ }).click()
  await c.getByRole('radio', { name: 'Quote' }).click()
  await expect(page.locator('.bn-editor blockquote')).toHaveCount(1)
  await c.getByRole('button', { name: 'Back' }).click()
  // The look is kept after a reload.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-note-size', '')
  await expect(page.locator('html')).toHaveAttribute('data-note-font', '')
})

test('Aa › List and Alignment cards', async ({ page }) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  await option(page, 'List').first().click()
  const c = card(page)
  await c.getByRole('radio', { name: 'Checklist' }).click()
  await expect(page.locator('.bn-editor input[type="checkbox"]')).toHaveCount(1)
  await c.getByRole('radio', { name: 'Numbers' }).click()
  await expect(
    page.locator('.bn-editor [data-content-type="numberedListItem"]'),
  ).toHaveCount(1)
  await expect(c.getByRole('button', { name: 'Toggle list' })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await option(page, 'Alignment').first().click()
  await expect(
    card(page).getByRole('group', { name: 'Alignment' }),
  ).toBeVisible()
  await card(page).getByRole('radio', { name: 'Centre' }).click()
  await expect(
    page.locator('.bn-editor [data-text-alignment="center"]'),
  ).toHaveCount(1)
  await card(page).getByRole('radio', { name: 'Justify' }).click()
  await expect(
    page.locator('.bn-editor [data-text-alignment="justify"]'),
  ).toHaveCount(1)
})

test('Aa › colour cards apply a named colour', async ({ page }) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  await page.keyboard.press('Control+a')
  await option(page, 'Choose a text colour').click()
  await card(page).getByRole('button', { name: 'Blue', exact: true }).click()
  await expect(
    page.locator('.bn-editor [data-style-type="textColor"][data-value="blue"]'),
  ).toHaveCount(1)
  await option(page, 'Choose a highlight colour').click()
  await card(page).getByRole('button', { name: 'Green', exact: true }).click()
  await expect(
    page.locator(
      '.bn-editor [data-style-type="backgroundColor"][data-value="green"]',
    ),
  ).toHaveCount(1)
})

test('Insert: Table and Shape first, then the rest; Table, Callout and Recall card work', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Insert', 'insert')
  const names = await pill(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(
    names.filter((n) => !/Move the options|Keep these|Close/.test(n!)),
  ).toEqual([
    'Table',
    'Shape',
    'Picture',
    'Camera',
    'File or PDF',
    'Write pad',
    'Handwriting',
    'Callout',
    'Audio',
    'Recall card',
    'Tape',
    'Magnifier',
    'Ruler',
  ])
  await option(page, 'Table').click()
  await expect(page.locator('.bn-editor table')).toHaveCount(1)
  await option(page, 'Callout').click()
  await expect(
    page.locator('.bn-editor [data-content-type="callout"]'),
  ).toHaveCount(1)
})

test('Read: one tap enters Reading mode; the reader controls replace the bar', async ({
  page,
}) => {
  await openNote(page)
  await tool(page, 'Read').click()
  await expect(page.getByTestId('reading-frame')).toHaveAttribute(
    'data-view',
    'inPlace',
  )
  // The main bar and ribbon are hidden while reading (B1).
  await expect(mainBar(page)).toHaveCount(0)
  const controls = page.getByTestId('reader-controls')
  const names = await controls
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(names).toEqual([
    'Exit reading',
    'Undo',
    'Redo',
    'Contents',
    'Bookmarks',
    'Reading look (Aa)',
    'Find',
    'Listen',
    'Edit page',
    'Keep the bar visible',
    'More reading options',
  ])
  // Aa: a sheet with Font, Layout, Themes and More.
  await controls.getByRole('button', { name: 'Reading look (Aa)' }).click()
  const sheet = page.getByRole('dialog', { name: 'Look and reading' })
  await expect(sheet.getByRole('tab')).toHaveText([
    'Font',
    'Layout',
    'Themes',
    'More',
  ])
  await sheet.getByRole('tab', { name: 'Themes' }).click()
  await sheet.getByRole('radio', { name: 'Sepia' }).click()
  await sheet.getByRole('tab', { name: 'Layout' }).click()
  await expect(sheet.getByRole('radiogroup').first()).toBeVisible()
  // Exit goes back to writing, with the main bar.
  await controls.getByRole('button', { name: 'Exit reading' }).click()
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await expect(tool(page, 'Read')).toHaveAttribute('aria-pressed', 'false')
})

test('the ⋯ menu: Edit bar first, then All tools (the ribbon), search, Done', async ({
  page,
}) => {
  await openNote(page)
  await barMenu(page).click()
  const items = page.locator('[data-bar="tray"] button:not([data-popup-close])')
  await expect(items.nth(0)).toHaveText('Edit toolbar…')
  await expect(items.nth(1)).toHaveText('All tools')
  await expect(items.nth(2)).toHaveText('Search all features')
  await expect(items.nth(3)).toHaveText('Done')
  await page.getByRole('button', { name: 'All tools' }).click()
  await expect(page.getByRole('tablist', { name: 'Tool tabs' })).toBeVisible()
})
