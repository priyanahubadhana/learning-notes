import { expect, test, type Page } from '@playwright/test'
import { selectText } from './helpers.ts'
import {
  card,
  openNote,
  openPill,
  option,
  pill,
  pref,
  tool,
} from './mainBarHelpers.ts'

/**
 * The ink tools' options pills and detail cards (redesign step 2). The
 * drawing engine is step 3, so these are the UI and the saved settings, with
 * a live preview; the tests check every option, card and sub-page.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const names = (page: Page) =>
  pill(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
const withoutFixed = (list: (string | null)[]) =>
  list.filter(
    (n) => !/^(Move the options|Keep these|Close|Layer [0-9])/.test(n ?? ''),
  )
const previewPath = (page: Page) =>
  page.locator('[data-ink-preview] path').getAttribute('d')

test('Pen pill: type, 3 thicknesses, colours and ⊕', async ({ page }) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  expect(withoutFixed(await names(page))).toEqual([
    'Pen type: Fountain',
    'Pen type',
    'Thin',
    'Medium',
    'Thick',
    'Black',
    'Blue',
    'Red',
    'Green',
    'Orange',
    'Purple',
    'Add a colour',
  ])
  await expect(option(page, 'Medium')).toHaveAttribute('aria-pressed', 'true')
  await option(page, 'Thick').click()
  await expect(option(page, 'Thick')).toHaveAttribute('aria-pressed', 'true')
  await expect(option(page, 'Medium')).toHaveAttribute('aria-pressed', 'false')
  await option(page, 'Red').click()
  await expect(option(page, 'Red')).toHaveAttribute('aria-pressed', 'true')
  const saved = await pref<{ size: number; colour: string }>(page, 'ink.pen')
  expect(saved).toMatchObject({ size: 2, colour: '#c62828' })
  // The pill stays open while options are chosen.
  await expect(pill(page, 'pen')).toBeVisible()
  // Remembered after a reload.
  await page.reload()
  await openPill(page, 'Pen', 'pen')
  await expect(option(page, 'Thick')).toHaveAttribute('aria-pressed', 'true')
  await expect(option(page, 'Red')).toHaveAttribute('aria-pressed', 'true')
})

test('Pen card: 5 types, a live preview and the sliders', async ({ page }) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  await option(page, 'Pen type').first().click() // the type button
  const c = card(page)
  await expect(c.getByRole('group', { name: 'Pen' })).toBeVisible()
  await expect(
    c.getByRole('radiogroup', { name: 'Pen type' }).getByRole('radio'),
  ).toHaveText(['Fountain', 'Ball', 'Brush', 'Pencil', 'Marker'])
  await expect(c.locator('[data-ink-preview="pen"]')).toBeVisible()
  // Sliders: sharpness, pressure, stabilisation and (Fountain) flatness.
  for (const label of [
    'Tip sharpness',
    'Pressure',
    'Stabilisation',
    'Flatness',
  ]) {
    await expect(c.getByRole('slider', { name: label })).toBeVisible()
  }
  const before = await previewPath(page)
  await c.getByRole('slider', { name: 'Pressure' }).fill('100')
  expect(await previewPath(page)).not.toBe(before)
  await c.getByRole('slider', { name: 'Stabilisation' }).fill('90')
  await c.getByRole('slider', { name: 'Tip sharpness' }).fill('10')
  expect(await pref(page, 'ink.pen')).toMatchObject({
    pressure: 100,
    stabilisation: 90,
    sharpness: 10,
  })
  // Brush has no flatness slider; the pen button shows the type.
  await c.getByRole('radio', { name: 'Brush' }).click()
  await expect(c.getByRole('slider', { name: 'Flatness' })).toHaveCount(0)
  await expect(option(page, 'Pen type: Brush')).toBeVisible()
  await c.getByRole('radio', { name: 'Marker' }).click()
  await expect(option(page, 'Pen type: Marker')).toBeVisible()
})

test('Pen card sub-pages: Pen settings, Pen gestures, Stroke (each with ‹ back)', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  await option(page, 'Pen type').first().click()
  const c = card(page)

  await c.getByRole('button', { name: /^Pen settings/ }).click()
  await expect(c.getByRole('group', { name: 'Pen settings' })).toBeVisible()
  for (const label of [
    'Tilt',
    'Thickness by speed',
    'Reduce latency',
    'Draw and hold for a perfect shape',
  ]) {
    await expect(
      c.getByRole('switch', { name: new RegExp(`^${label}`) }),
    ).toBeVisible()
  }
  const speed = c.getByRole('switch', { name: /^Thickness by speed/ })
  await expect(speed).toHaveAttribute('aria-checked', 'false')
  await speed.click()
  await expect(speed).toHaveAttribute('aria-checked', 'true')
  await c.getByRole('button', { name: 'Back' }).click()
  await expect(c.getByRole('group', { name: 'Pen' })).toBeVisible()

  await c.getByRole('button', { name: /^Pen gestures/ }).click()
  const scribble = c.getByRole('switch', { name: /^Scribble to erase/ })
  const circle = c.getByRole('switch', { name: /^Circle to lasso/ })
  await expect(scribble).toBeVisible()
  await scribble.click()
  await circle.click()
  await expect(scribble).toHaveAttribute('aria-checked', 'true')
  await c.getByRole('button', { name: 'Back' }).click()

  await c.getByRole('button', { name: /^Stroke/ }).click()
  await expect(c.getByRole('group', { name: 'Stroke' })).toBeVisible()
  const solid = await previewPath(page)
  await c.getByRole('radio', { name: 'Dashed' }).click()
  await expect(c.locator('[data-ink-preview] path')).toHaveAttribute(
    'stroke-dasharray',
    /\d/,
  )
  await c.getByRole('radio', { name: 'Dotted' }).click()
  await c.getByRole('radio', { name: 'Solid' }).click()
  expect(await previewPath(page)).toBe(solid)
  await c.getByRole('slider', { name: 'Exact thickness' }).fill('9')
  await expect(option(page, 'Medium')).toHaveAttribute('aria-pressed', 'false')
  await c.getByRole('button', { name: 'Use the 3 sizes again' }).click()
  await expect(option(page, 'Medium')).toHaveAttribute('aria-pressed', 'true')
  await c.getByRole('button', { name: 'Back' }).click()

  expect(await pref(page, 'ink.pen')).toMatchObject({
    speedWidth: true,
    scribbleErase: true,
    circleLasso: true,
  })
})

test('tapping the active thickness opens Stroke; the active colour opens the colour page; ⊕ adds a colour', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  await option(page, 'Medium').click() // the active one again
  await expect(card(page).getByRole('group', { name: 'Stroke' })).toBeVisible()
  await card(page).getByRole('button', { name: 'Back' }).click()
  await option(page, 'Black').click() // the active colour again
  await expect(
    card(page).getByRole('group', { name: 'Pen colour' }),
  ).toBeVisible()
  await card(page).locator('[data-card-colour-input]').fill('#12ab34')
  await card(page).getByRole('button', { name: 'Add a colour' }).click()
  await expect(option(page, '#12ab34')).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await openPill(page, 'Pen', 'pen')
  await expect(option(page, '#12ab34')).toBeVisible()
})

test('Highlighter: its own tool with thicknesses, colours and a card', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Highlighter', 'highlighter')
  expect(withoutFixed(await names(page))).toEqual([
    'Thin',
    'Medium',
    'Thick',
    'Yellow',
    'Green',
    'Blue',
    'Pink',
    'Orange',
    'Purple',
    'Add a colour',
    'Highlighter settings',
  ])
  await option(page, 'Thick').click()
  await option(page, 'Pink').click()
  expect(await pref(page, 'ink.highlighter')).toMatchObject({
    size: 2,
    colour: '#f8c6dd',
  })
  await option(page, 'Highlighter settings').click()
  const c = card(page)
  await expect(c.getByRole('group', { name: 'Highlighter' })).toBeVisible()
  await expect(c.locator('[data-ink-preview="highlighter"]')).toBeVisible()
  const snap = c.getByRole('switch', { name: /^Snap to text lines/ })
  await expect(snap).toHaveAttribute('aria-checked', 'true')
  await snap.click()
  await c.getByRole('switch', { name: /^Draw behind ink/ }).click()
  await c.getByRole('slider', { name: 'Opacity' }).fill('30')
  await c.getByRole('switch', { name: /^Save to notes/ }).click()
  expect(await pref(page, 'ink.highlighter')).toMatchObject({
    snapToText: false,
    behindInk: false,
    opacity: 30,
    saveToNotes: true,
  })
  await c.getByRole('button', { name: 'Colour' }).click()
  await expect(
    c.getByRole('group', { name: 'Highlighter colour' }),
  ).toBeVisible()
  await c.getByRole('button', { name: 'Back' }).click()
  // Highlight eraser selects the Eraser, limited to highlights.
  await c.getByRole('button', { name: 'Highlight eraser' }).click()
  await expect(tool(page, 'Eraser')).toHaveAttribute('aria-pressed', 'true')
  await expect(pill(page, 'eraser')).toBeVisible()
  await expect(option(page, 'Erase highlights only')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('Eraser: Precise, Standard or Whole stroke, a size, and highlights only', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Eraser', 'eraser')
  expect(withoutFixed(await names(page))).toEqual([
    'Precise',
    'Standard',
    'Whole stroke',
    'Thin',
    'Medium',
    'Thick',
    'Erase highlights only',
  ])
  await expect(option(page, 'Standard')).toHaveAttribute('aria-pressed', 'true')
  await option(page, 'Precise').click()
  await option(page, 'Thick').click()
  await option(page, 'Erase highlights only').click()
  expect(await pref(page, 'ink.eraser')).toMatchObject({
    mode: 'precise',
    size: 2,
    highlightsOnly: true,
  })
  // The active mode again opens the card with an explanation.
  await option(page, 'Precise').click()
  const c = card(page)
  await expect(c.getByRole('group', { name: 'Eraser' })).toBeVisible()
  await c.getByRole('radio', { name: 'Whole stroke' }).click()
  await expect(c.getByText('Removes the whole line you touch.')).toBeVisible()
  await expect(option(page, 'Whole stroke')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await c.getByRole('switch', { name: 'Erase highlights only' }).click()
  await expect(option(page, 'Erase highlights only')).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('Lasso: free-hand or rectangle, and a filter for ink, pictures or text', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Lasso', 'lasso')
  expect(withoutFixed(await names(page))).toEqual([
    'Free-hand',
    'Rectangle',
    'Ink',
    'Pictures',
    'Text',
  ])
  await option(page, 'Rectangle').click()
  await option(page, 'Pictures').click()
  expect(await pref(page, 'ink.lasso')).toMatchObject({
    shape: 'rect',
    pictures: false,
    ink: true,
    text: true,
  })
  await option(page, 'Rectangle').click() // active again: the card
  await expect(card(page).getByRole('group', { name: 'Lasso' })).toBeVisible()
  await expect(
    card(page).getByRole('switch', { name: 'Pictures' }),
  ).toHaveAttribute('aria-checked', 'false')
})

test('Lasso menu on a selection: Copy, Duplicate, Delete, Key point, Make card; ink tools say they are coming', async ({
  page,
}) => {
  await openNote(page)
  await selectText(page, 'nucleus')
  await tool(page, 'Lasso').click()
  const menu = page.locator('[data-selection-menu]')
  await expect(menu).toBeVisible()
  const items = await menu
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(items).toEqual([
    'Copy',
    'Cut',
    'Duplicate',
    'Delete',
    'Colour',
    'Move',
    'Scale',
    'Rotate',
    'Screenshot of the selection',
    'Key point',
    'Make card',
    'Save to notes',
    'Convert handwriting to text (beta)',
  ])
  await menu.getByRole('button', { name: 'Key point' }).click()
  await expect(
    page.locator('.bn-editor .recall-mark[data-mark="key"]'),
  ).toHaveText('nucleus')
  // Move, scale, rotate and screenshot work on drawings; convert is later.
  await menu.getByRole('button', { name: 'Move' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: /works on drawings/ }),
  ).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Move' })).toHaveAttribute(
    'data-coming',
    '',
  )
  // Duplicate copies the block.
  await menu.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.locator('.bn-editor .bn-block-content')).toHaveCount(2)
})

test('Lasso menu: Delete removes the selected text', async ({ page }) => {
  await openNote(page)
  await selectText(page, 'nucleus')
  await tool(page, 'Lasso').click()
  const menu = page.locator('[data-selection-menu]')
  await menu.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.bn-editor')).not.toContainText('nucleus')
  await expect(page.locator('.bn-editor')).toContainText('The')
  // Undo brings it back.
  await tool(page, 'Undo').click()
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
})
