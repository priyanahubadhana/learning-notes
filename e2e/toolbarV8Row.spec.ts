// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Toolbar v8, slice 1b: the tool row (TB-08, TB-21, TB-40). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

async function open(page: Page, size?: { width: number; height: number }) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    )
  })
  if (size) await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
}

const row = (page: Page) => page.getByTestId('v8-row')

test('TB-21 the Pen row reads Type, Size, Colour, Feel, then plus and list', async ({
  page,
}) => {
  await open(page)
  const ids = await row(page)
    .locator('[data-testid^="v8-chip-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(ids).toEqual([
    'v8-chip-pen.type',
    'v8-chip-pen.size',
    'v8-chip-pen.colour',
    'v8-chip-pen.feel',
  ])
  await expect(page.getByTestId('v8-chip-pen.type')).toContainText(
    'Fountain pen',
  )
  await expect(page.getByTestId('v8-chip-pen.size')).toContainText('Medium')
  const feel = (await page.getByTestId('v8-chip-pen.feel').boundingBox())!
  const add = (await page.getByTestId('v8-add').boundingBox())!
  const org = (await page.getByTestId('v8-organise').boundingBox())!
  expect(add.x).toBeGreaterThan(feel.x + feel.width)
  expect(org.x).toBeGreaterThan(add.x)
  expect(add.width).toBeGreaterThanOrEqual(43.5)
  expect(add.height).toBeGreaterThanOrEqual(43.5)
})

test('TB-40 the Text row reads Box, Format, B, I', async ({ page }) => {
  await open(page)
  await page.getByTestId('v8-tool-text').click()
  const ids = await row(page)
    .locator('[data-testid^="v8-chip-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(ids).toEqual([
    'v8-chip-text.box',
    'v8-chip-text.format',
    'v8-chip-text.bold',
    'v8-chip-text.italic',
  ])
})

test('TB-08 a wide screen shows every chip with its name and no fold button', async ({
  page,
}) => {
  await open(page)
  await expect(page.getByTestId('v8-row-more')).toHaveCount(0)
  await expect(page.getByTestId('v8-chip-pen.type')).toContainText(
    'Fountain pen',
  )
})

test('TB-08 a narrower row loses the names first, then folds; it never scrolls sideways', async ({
  page,
}) => {
  await open(page, { width: 560, height: 800 })
  await expect(page.getByTestId('v8-chip-pen.type')).not.toContainText(
    'Fountain',
  )
  await expect(page.getByTestId('v8-row-more')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  const more = page.getByTestId('v8-row-more')
  await expect(more).toBeVisible()
  const hidden = await row(page)
    .locator('.v8row-items')
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(hidden).toBeLessThanOrEqual(0)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('TB-08 every folded item can be tapped from the fold list', async ({
  page,
}) => {
  await open(page, { width: 390, height: 844 })
  await page.getByTestId('v8-row-more').click()
  const list = page.getByTestId('v8-card-fold.row')
  await expect(list).toBeVisible()
  const entries = list.locator('[data-testid^="v8-fold-"]')
  expect(await entries.count()).toBeGreaterThan(0)
  const id = (await entries.first().getAttribute('data-testid'))!.slice(
    'v8-fold-'.length,
  )
  await entries.first().click()
  await expect(page.getByTestId(`v8-card-pen.${id}`)).toBeVisible()
  await expect(page.locator('.pcard')).toHaveCount(1)
})
