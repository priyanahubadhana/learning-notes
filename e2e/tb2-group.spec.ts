// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { lassoAround } from './groupHelpers.ts'

/**
 * Phase 2B, task 2B.10 (switch textbox.v2 ON): TB-32 a Lasso loop on empty
 * paper picks the boxes inside, with one group pill (count, Group / Ungroup).
 * TB-33 dragging one picked box moves them all, one Undo. TB-34 Layout Assist:
 * the page zooms out a little, boxes wiggle, the coach line, the Layouts
 * strip, Done ends it. TB-35 a layout tile shows its result at once; Undo
 * returns the old layout.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!
const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
const COACH =
  'This is how your page will look. Drag any box to move it, pull an edge to resize. Tap Done when happy.'

async function start(page: Page, name: string) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
}

async function addBox(page: Page, text: string, down = 60) {
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetEl.count())
    ? await rect(sheetEl)
    : { x: 0, width: 300 }
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const n = await page.locator(EXTRA).count()
  const last = n ? await rect(page.locator(EXTRA).nth(n - 1)) : null
  const y = last ? last.y + last.height + 40 : main.y + main.height + down
  await page.mouse.click(sheet.x + sheet.width * 0.3, y)
  const box = page.locator(EXTRA).nth(n)
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return box
}

async function threeBoxes(page: Page, name: string) {
  await start(page, name)
  await typeInEditor(page, 'Main text')
  const a = await addBox(page, 'Alpha')
  const b = await addBox(page, 'Beta')
  const c = await addBox(page, 'Gamma')
  return { a, b, c }
}

const pill = (page: Page) => page.locator('[data-group-pill]')

test('TB-32 a Lasso loop picks the boxes inside; one group pill shows the count, Group on, Ungroup off', async ({
  page,
}) => {
  const { a, b, c } = await threeBoxes(page, 'TB32')
  await lassoAround(page, [0, 1])
  await expect(a).toHaveAttribute('data-picked', '')
  await expect(b).toHaveAttribute('data-picked', '')
  await expect(c).not.toHaveAttribute('data-picked', '')
  await expect(pill(page)).toHaveCount(1)
  await expect(pill(page)).toContainText('2 boxes')
  // Several picked: no single-box bar or ⋯ list (the pill is the one control).
  await expect(page.locator('[data-box-bar-holder]')).toHaveCount(0)
  const group = pill(page).locator('[data-group-action="group"]')
  const ungroup = pill(page).locator('[data-group-action="ungroup"]')
  await expect(group).toBeEnabled()
  await expect(ungroup).toBeDisabled()
  expect((await rect(group)).height).toBeGreaterThanOrEqual(44)
  await group.click()
  await expect(
    pill(page).locator('[data-group-action="ungroup"]'),
  ).toBeEnabled()
  await expect(pill(page).locator('[data-group-action="group"]')).toBeDisabled()
  // The pill does not sit on a picked box.
  const p = await rect(pill(page))
  for (const box of [a, b]) {
    const r = await rect(box)
    expect(p.y + p.height <= r.y + 1 || p.y >= r.y + r.height - 1).toBe(true)
  }
})

test('TB-33 dragging one picked box moves all of them together; one Undo puts all back', async ({
  page,
}) => {
  const { a, b } = await threeBoxes(page, 'TB33')
  await lassoAround(page, [0, 1])
  await expect(pill(page)).toBeVisible()
  const a0 = await rect(a)
  const b0 = await rect(b)
  const from = await centre(b.locator('[data-box-grip]'))
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(200)
  await page.mouse.move(from.x + 60, from.y + 20, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(700)
  const a1 = await rect(a)
  const b1 = await rect(b)
  expect(Math.abs(a1.x - a0.x) + Math.abs(a1.y - a0.y)).toBeGreaterThan(4)
  // Both moved by the same step.
  expect(Math.abs(a1.x - a0.x - (b1.x - b0.x))).toBeLessThan(3)
  expect(Math.abs(a1.y - a0.y - (b1.y - b0.y))).toBeLessThan(3)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(700)
  const a2 = await rect(a)
  const b2 = await rect(b)
  expect(Math.abs(a2.x - a0.x) + Math.abs(a2.y - a0.y)).toBeLessThan(3)
  expect(Math.abs(b2.x - b0.x) + Math.abs(b2.y - b0.y)).toBeLessThan(3)
})

async function openAssist(page: Page) {
  await page.getByTestId('main-layout').click()
  await expect(page.locator('[data-layout-assist]')).toBeVisible()
}

test('TB-34 Layout Assist: page zoomed out a little, boxes wiggle, coach line, Layouts strip, Done ends it', async ({
  page,
}) => {
  const { a } = await threeBoxes(page, 'TB34')
  const w0 = (await rect(page.locator('[data-paper]'))).width
  await openAssist(page)
  await expect(page.locator('[data-paper]')).toHaveAttribute(
    'data-layout-mode',
    '',
  )
  const w1 = (await rect(page.locator('[data-paper]'))).width
  expect(w1).toBeLessThan(w0)
  expect(w1).toBeGreaterThan(w0 * 0.7)
  await expect(page.locator('[data-layout-coach]')).toHaveText(COACH)
  const strip = page.locator('[data-layout-strip]')
  await expect(strip).toContainText('Layouts')
  for (const name of ['One column', 'Two columns', 'Six boxes', 'Side + two'])
    await expect(strip.getByRole('button', { name })).toBeVisible()
  // No key names anywhere in the mode.
  await expect(page.locator('[data-layout-assist]')).not.toContainText(
    /ctrl|cmd|⌘|esc\b/i,
  )
  // Boxes wiggle.
  const anim = await a
    .locator('[data-box-content]')
    .evaluate((e) => getComputedStyle(e).animationName)
  expect(anim).toBe('ln-wiggle')
  // A tap on a tile leaves no focus ring.
  const tile = strip.getByRole('button', { name: 'One column' })
  await tile.click()
  const ring = await tile.evaluate((e) => {
    const cs = getComputedStyle(e)
    return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
  })
  expect(ring).toBe(false)
  expect((await rect(tile)).height).toBeGreaterThanOrEqual(44)
  await strip.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('[data-layout-assist]')).toHaveCount(0)
  await expect(page.locator('[data-paper]')).not.toHaveAttribute(
    'data-layout-mode',
    '',
  )
  expect(
    Math.abs((await rect(page.locator('[data-paper]'))).width - w0),
  ).toBeLessThan(2)
})

test('TB-35 a layout tile shows its result at once; one Undo returns the old layout', async ({
  page,
}) => {
  const { a, b } = await threeBoxes(page, 'TB35')
  const a0 = await rect(a)
  const b0 = await rect(b)
  expect(Math.abs(a0.x - b0.x)).toBeLessThan(4)
  await openAssist(page)
  const two = page
    .locator('[data-layout-strip]')
    .getByRole('button', { name: 'Two columns' })
  await two.click()
  await expect(two).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(async () => {
      const x = await rect(a)
      const y = await rect(b)
      return Math.abs(x.y - y.y) < 6 && y.x > x.x + x.width / 2
    })
    .toBe(true)
  await page
    .locator('[data-layout-strip]')
    .getByRole('button', { name: 'Done' })
    .click()
  await page.keyboard.press('Control+z')
  await expect
    .poll(async () => {
      const y = await rect(b)
      return Math.abs(y.x - b0.x) < 4 && Math.abs(y.y - b0.y) < 4
    })
    .toBe(true)
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('no wiggle, the states still change', async ({ page }) => {
    const { a, b } = await threeBoxes(page, 'TB34r')
    await openAssist(page)
    const anim = await a
      .locator('[data-box-content]')
      .evaluate((e) => getComputedStyle(e).animationName)
    expect(anim).toBe('none')
    const two = page
      .locator('[data-layout-strip]')
      .getByRole('button', { name: 'Two columns' })
    await expect(two).toHaveAttribute('aria-pressed', 'false')
    await two.click()
    await expect(two).toHaveAttribute('aria-pressed', 'true')
    await expect
      .poll(async () => {
        const x = await rect(a)
        const y = await rect(b)
        return Math.abs(x.y - y.y) < 6
      })
      .toBe(true)
    await page
      .locator('[data-layout-strip]')
      .getByRole('button', { name: 'Done' })
      .click()
    await expect(page.locator('[data-layout-assist]')).toHaveCount(0)
  })
})
