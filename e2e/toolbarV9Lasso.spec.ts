// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Tool bar v9, task 2A.11: the Lasso rebuilt from the live Lasso
 * (TB-32, TB-33, TB-50; mock v9). Beginner: Shape and Actions menus.
 * Professional: Free-hand / Rectangle and "Picks" right on the bar, one
 * Options menu with the menu-row order and Layers folded inside.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'

async function open(page: Page, level: Level = 'beginner') {
  await page.addInitScript((l) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({
        level: l,
        unlocked: l === 'professional' ? ['tb.lassoOptions'] : [],
      }),
    )
  }, level)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-lasso').click()
}

const chip = (page: Page, id: string) => page.getByTestId(`v8-chip-${id}`)
const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)
const stored = (page: Page, key: string) =>
  page.evaluate(
    (k) => JSON.parse(localStorage.getItem(`learning-notes:ink.${k}`) ?? '{}'),
    key,
  )
const rowOrder = (page: Page) =>
  page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      if (k.endsWith('ink.lasso.row'))
        return JSON.parse(localStorage.getItem(k)!) as string[]
    }
    return null
  })

test('Beginner Lasso row: Shape and Actions menus only', async ({ page }) => {
  await open(page)
  await expect(chip(page, 'lasso.shape')).toBeVisible()
  await expect(chip(page, 'lasso.actions')).toBeVisible()
  await expect(page.getByTestId('v8-lasso-bar-shape')).toHaveCount(0)
  await expect(page.getByTestId('v8-lasso-bar-picks')).toHaveCount(0)
  await expect(chip(page, 'lasso.opts')).toHaveCount(0)
})

test('Professional Lasso row: Free-hand / Rectangle and Picks on the bar, one Options menu', async ({
  page,
}) => {
  await open(page, 'professional')
  const shape = page.getByTestId('v8-lasso-bar-shape')
  await expect(shape.getByRole('radio')).toHaveCount(2)
  await expect(page.getByTestId('v8-lasso-bar-free')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByTestId('v8-lasso-bar-rect').click()
  expect((await stored(page, 'lasso')).shape).toBe('rect')
  await expect(page.getByTestId('v8-lasso-bar-rect')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  const picks = page.getByTestId('v8-lasso-bar-picks')
  await expect(picks.getByRole('checkbox')).toHaveCount(3)
  await expect(page.getByTestId('v8-lasso-pick-ink')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByTestId('v8-lasso-pick-text').click()
  expect((await stored(page, 'lasso')).text).toBe(true)
  await page.getByTestId('v8-lasso-pick-ink').click()
  expect((await stored(page, 'lasso')).ink).toBe(false)
  await expect(chip(page, 'lasso.opts')).toBeVisible()
  await expect(chip(page, 'lasso.actions')).toHaveCount(0)
  await expect(chip(page, 'lasso.shape')).toHaveCount(0)
})

test('Options card: a picture of the menu, Menu row and Layers folded', async ({
  page,
}) => {
  await open(page, 'professional')
  await chip(page, 'lasso.opts').click()
  const c = card(page, 'lasso.opts')
  await expect(c).toBeVisible()
  const preview = c.getByTestId('v8-lasso-preview')
  await expect(preview).toContainText('Copy')
  await expect(preview).toContainText('More')
  // Both folds are closed until asked.
  await expect(c.getByTestId('v8-lasso-row')).toHaveCount(0)
  await expect(c.getByTestId('v8-lasso-layers')).toHaveCount(0)
  await c.getByRole('button', { name: /Menu row/ }).click()
  await expect(c.getByTestId('v8-lasso-row')).toBeVisible()
  await c.getByRole('button', { name: /Layers/ }).click()
  await expect(c.getByTestId('v8-lasso-layers')).toBeVisible()
})

test('Menu row: order with the arrows, a switch sends an action under More, all ten stay', async ({
  page,
}) => {
  await open(page, 'professional')
  await chip(page, 'lasso.opts').click()
  const c = card(page, 'lasso.opts')
  await c.getByRole('button', { name: /Menu row/ }).click()
  await c.getByRole('button', { name: 'Move Copy later' }).click()
  const after = (await rowOrder(page))!
  expect(after.slice(0, 2)).toEqual(['cut', 'copy'])
  await expect(
    c.getByRole('button', { name: 'Move Cut earlier' }),
  ).toBeDisabled()
  // Switch Copy off: it leaves the row and waits under More.
  await c.getByRole('switch', { name: 'Copy in the menu row' }).click()
  expect(await rowOrder(page)).not.toContain('copy')
  await expect(
    c.getByTestId('v8-lasso-undermore').getByText('Copy'),
  ).toBeVisible()
  // Ten switches in all: nothing from the live Lasso is dropped.
  await expect(c.getByTestId('v8-lasso-row').getByRole('switch')).toHaveCount(
    10,
  )
  await c.getByRole('switch', { name: 'Copy in the menu row' }).click()
  expect(await rowOrder(page)).toContain('copy')
})

test('Options card keeps Layers: the same layer list as the live Lasso', async ({
  page,
}) => {
  await open(page, 'professional')
  await chip(page, 'lasso.opts').click()
  const c = card(page, 'lasso.opts')
  await c.getByRole('button', { name: /Layers/ }).click()
  await expect(c.getByTestId('v8-lasso-layers')).toContainText('Add Layer 2')
  await expect(c.getByTestId('v8-lasso-layers')).toContainText(
    'A hidden or locked layer cannot be selected.',
  )
})

test('Professional Lasso on a phone: the bar chips fold into the ⋯ list and the picks open as a card', async ({
  page,
}) => {
  await open(page, 'professional')
  await page.setViewportSize({ width: 390, height: 844 })
  const more = page.getByTestId('v8-row-more')
  await expect(more).toBeVisible()
  await more.click()
  const fold = page.getByTestId('v8-card-fold.row')
  await expect(fold).toBeVisible()
  await fold.getByRole('button', { name: /What it picks/ }).click()
  await expect(card(page, 'lasso.picks').getByRole('switch')).toHaveCount(3)
})

test('Professional Lasso Options card hangs under its chip and stays inside the window', async ({
  page,
}) => {
  await open(page, 'professional')
  await chip(page, 'lasso.opts').click()
  const c = (await card(page, 'lasso.opts').boundingBox())!
  const a = (await chip(page, 'lasso.opts').boundingBox())!
  const vp = page.viewportSize()!
  expect(c.y).toBeGreaterThanOrEqual(a.y + a.height)
  expect(c.y + c.height).toBeLessThanOrEqual(vp.height)
  expect(c.x + c.width).toBeLessThanOrEqual(vp.width)
})

/** The left edge a person sees: a box's border, else its first text or icon. */
const layersEdges = (page: Page) =>
  page.getByTestId('v8-lasso-layers').evaluate((root) => {
    const seen = (el: Element) => {
      const s = getComputedStyle(el)
      if (parseFloat(s.borderLeftWidth) > 0 || el.tagName === 'HR')
        return el.getBoundingClientRect().left
      const icon = el.querySelector('svg')
      if (icon) return icon.getBoundingClientRect().left
      const range = document.createRange()
      range.selectNodeContents(el)
      return range.getBoundingClientRect().left
    }
    const out: Record<string, number> = {}
    const pick = (name: string, sel: string) => {
      const el = root.querySelector(sel)
      if (el) out[name] = Math.round(seen(el) * 10) / 10
    }
    pick('empty', ':scope > p:not(.pcard-note)')
    pick('layer', '[data-layer]')
    pick('page', '[data-layer-page]')
    pick('add', '[data-layer-add]')
    pick('merge', '[data-layer-merge]')
    pick('line', 'hr')
    pick('paper', '[data-chip]')
    pick('asDrawn', '[data-card-action="asDrawn"]')
    pick('note', '.pcard-note')
    return out
  })

test('Options card Layers fold: every part starts on one left edge', async ({
  page,
}) => {
  await open(page, 'professional')
  await chip(page, 'lasso.opts').click()
  const c = card(page, 'lasso.opts')
  await c.getByRole('button', { name: /Layers/ }).click()
  const edges = await layersEdges(page)
  expect(Object.keys(edges).length).toBeGreaterThanOrEqual(7)
  const values = Object.values(edges)
  expect(
    Math.max(...values) - Math.min(...values),
    JSON.stringify(edges),
  ).toBeLessThanOrEqual(1)
  // With layers the rows and Merge keep that edge too.
  await c.getByRole('button', { name: 'Add Layer 2' }).click()
  await c.getByRole('button', { name: 'Add Layer 2' }).click()
  const more = await layersEdges(page)
  expect(more.layer, JSON.stringify(more)).toBeDefined()
  for (const v of Object.values(more))
    expect(Math.abs(v - values[0]!), JSON.stringify(more)).toBeLessThanOrEqual(
      1,
    )
  // The same edge as the note under the menu picture, higher in the card.
  const note = await c
    .locator('.pcard-note')
    .first()
    .evaluate((el) => el.getBoundingClientRect().left)
  expect(
    Math.abs(values[0]! - note),
    JSON.stringify(edges),
  ).toBeLessThanOrEqual(1)
})
