// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Toolbar v8, slice 1d: Eraser, Shapes, Lasso cards and the selection bar (TB-30 to TB-33). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'

async function open(
  page: Page,
  tool: 'eraser' | 'shapes' | 'lasso',
  level: Level = 'beginner',
  unlocked: string[] = [],
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, unlocked] as const,
  )
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId(`v8-tool-${tool}`).click()
}

const chip = (page: Page, id: string) => page.getByTestId(`v8-chip-${id}`)
const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)

async function openCard(page: Page, id: string) {
  await chip(page, id).click()
  await expect(card(page, id)).toBeVisible()
}

const stored = (page: Page, key: string) =>
  page.evaluate(
    (k) => JSON.parse(localStorage.getItem(`learning-notes:ink.${k}`) ?? '{}'),
    key,
  )

test('TB-30 Beginner Eraser: two types and three sizes, nothing else; a pick closes the card', async ({
  page,
}) => {
  await open(page, 'eraser')
  await openCard(page, 'eraser.mode')
  const tiles = card(page, 'eraser.mode').getByRole('radio')
  await expect(tiles).toHaveCount(2)
  await expect(tiles.nth(0)).toContainText('Standard')
  await expect(tiles.nth(1)).toContainText('Whole stroke')
  await expect(card(page, 'eraser.mode').getByRole('switch')).toHaveCount(0)
  await page.getByTestId('v8-eraser-mode-stroke').click()
  await expect(card(page, 'eraser.mode')).toHaveCount(0)
  expect((await stored(page, 'eraser')).mode).toBe('stroke')
  await openCard(page, 'eraser.size')
  await expect(card(page, 'eraser.size').getByRole('radio')).toHaveCount(3)
  await page.getByTestId('v8-eraser-size-2').click()
  await expect(card(page, 'eraser.size')).toHaveCount(0)
  expect((await stored(page, 'eraser')).size).toBe(2)
})

test('TB-30 Professional Eraser brings back Precise, highlights only, go back after one erase and the size ring', async ({
  page,
}) => {
  await open(page, 'eraser', 'professional', ['tb.eraserOptions'])
  await openCard(page, 'eraser.mode')
  await expect(card(page, 'eraser.mode').getByRole('radio')).toHaveCount(3)
  const sw = card(page, 'eraser.mode').getByRole('switch')
  await expect(sw).toHaveCount(2)
  await sw.nth(0).click()
  await sw.nth(1).click()
  const e = await stored(page, 'eraser')
  expect(e.highlightsOnly).toBe(true)
  expect(e.returnAfter).toBe(true)
  // A Professional card stays open after a pick.
  await page.getByTestId('v8-eraser-mode-precise').click()
  await expect(card(page, 'eraser.mode')).toBeVisible()
  await page.keyboard.press('Escape')
  await openCard(page, 'eraser.size')
  await expect(page.getByTestId('v8-eraser-ring')).toBeVisible()
})

test('TB-31 Shapes has its own slot; the card has sections, no sideways strip; Beginner has no aids', async ({
  page,
}) => {
  await open(page, 'shapes')
  await expect(page.getByTestId('toolbar-v8')).toHaveAttribute(
    'data-tool',
    'shapes',
  )
  // Tapping Shapes makes the pen draw a clean shape.
  expect(['rect', 'line', 'arrow', 'ellipse', 'triangle']).toContain(
    (await stored(page, 'pen')).drawAs,
  )
  await openCard(page, 'shapes.shape')
  const c = card(page, 'shapes.shape')
  await expect(c.getByRole('radio')).toHaveCount(5)
  await expect(c.getByText('Draw as').first()).toBeVisible()
  await expect(c.getByText('Shape help').first()).toBeVisible()
  await expect(c.getByText('Ruler')).toHaveCount(0)
  const wide = await c.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
  expect(wide).toBe(false)
  await page.getByTestId('v8-shape-ellipse').click()
  expect((await stored(page, 'pen')).drawAs).toBe('ellipse')
  // The tool stays Shapes (the pen is only how it draws).
  await expect(page.getByTestId('toolbar-v8')).toHaveAttribute(
    'data-tool',
    'shapes',
  )
})

test('TB-31 Professional Shapes adds Ruler, Magnifier and Colour picker; Size and Colour cards open', async ({
  page,
}) => {
  await open(page, 'shapes', 'professional', ['tb.shapesAids'])
  await openCard(page, 'shapes.shape')
  const c = card(page, 'shapes.shape')
  await expect(c.getByText('Ruler')).toBeVisible()
  await expect(c.getByText('Magnifier')).toBeVisible()
  await expect(c.getByLabel('Colour picker')).toBeVisible()
  await page.keyboard.press('Escape')
  await openCard(page, 'shapes.size')
  await expect(
    card(page, 'shapes.size').locator('[data-testid^="v8-pen-size-"]'),
  ).toHaveCount(3)
  await page.keyboard.press('Escape')
  await openCard(page, 'shapes.colour')
  await expect(card(page, 'shapes.colour').getByRole('radio')).toHaveCount(6)
})

test('TB-32 Lasso: shape tiles and the action list; Professional adds what it picks and the menu row', async ({
  page,
}) => {
  await open(page, 'lasso')
  await openCard(page, 'lasso.shape')
  await expect(card(page, 'lasso.shape').getByRole('radio')).toHaveCount(2)
  await page.getByTestId('v8-lasso-shape-rect').click()
  await expect(card(page, 'lasso.shape')).toHaveCount(0)
  expect((await stored(page, 'lasso')).shape).toBe('rect')
  await openCard(page, 'lasso.actions')
  await expect(
    page.getByTestId('v8-lasso-actions').getByRole('listitem'),
  ).toHaveCount(7)
  await expect(card(page, 'lasso.actions').getByRole('switch')).toHaveCount(0)
})

test('TB-32 Professional Lasso lists what it picks and which actions sit in the menu row', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', ['tb.lassoOptions'])
  await openCard(page, 'lasso.actions')
  const c = card(page, 'lasso.actions')
  await expect(c.getByText('What it picks')).toBeVisible()
  const picks = c.getByTestId('v8-lasso-picks').getByRole('switch')
  await expect(picks).toHaveCount(3)
  await picks.nth(2).click()
  expect((await stored(page, 'lasso')).text).toBe(true)
  await expect(c.getByText('Actions in the menu row')).toBeVisible()
  await expect(c.getByTestId('v8-lasso-row').getByRole('switch')).toHaveCount(
    10,
  )
})

/** Selects the whole line with the keyboard (the Lasso is already the tool). */
async function selectLine(page: Page) {
  await page.getByText('The nucleus holds the DNA').click({ force: true })
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
}

test('TB-33 a selection shows the bar: Cut, Copy, Paste, Duplicate, Colour, Resize, Delete, then More', async ({
  page,
}) => {
  await open(page, 'lasso')
  await selectLine(page)
  const bar = page.getByTestId('v8-selbar')
  await expect(bar).toBeVisible()
  const names = await bar
    .getByRole('button')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(names).toEqual([
    'Cut',
    'Copy',
    'Paste',
    'Duplicate',
    'Colour',
    'Resize',
    'Delete',
    'More',
  ])
  for (const b of await bar.getByRole('button').all()) {
    const box = (await b.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
  const vp = page.viewportSize()!
  const r = (await bar.boundingBox())!
  expect(r.x).toBeGreaterThanOrEqual(0)
  expect(r.x + r.width).toBeLessThanOrEqual(vp.width)
})

test('TB-33 Delete removes the selected words; Beginner More has Deselect only', async ({
  page,
}) => {
  await open(page, 'lasso')
  await selectLine(page)
  await page.getByTestId('v8-sel-more').click()
  const more = card(page, 'sel.more')
  const items = more.locator('.v8sel-more button')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('Deselect')
  await page.keyboard.press('Escape')
  await page.getByTestId('v8-sel-delete').click()
  await expect(page.locator('.bn-editor')).not.toContainText('nucleus')
  await expect(page.getByTestId('v8-selbar')).toHaveCount(0)
})

test('TB-33 Professional More adds Convert, Screenshot, Key point, Make card, Summary, Save, Move, Scale, Rotate', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', ['tb.selectionMenu'])
  await selectLine(page)
  await page.getByTestId('v8-sel-more').click()
  await expect(
    card(page, 'sel.more').locator('.v8sel-more button'),
  ).toHaveCount(10)
})
