// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Phase Q steps 1–2: every page is paper. The page's text is one default
 * box on A4 sheets; the paper grows a sheet at a time; zoom changes the
 * paper's width and the text scales with it.
 */

test('a page shows on an A4 sheet with its text in one box; zoom and fit', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Sheet one')
  await typeInEditor(page, 'Hello paper')

  const paper = page.locator('[data-paper]')
  const sheet = page.locator('[data-paper-sheet="1"]')
  const box = page.locator('[data-paper-box="main"]')
  await expect(paper).toHaveAttribute('data-sheet', 'A4')
  await expect(box).toContainText('Hello paper')
  // A4 proportions, and the box sits inside the sheet's margins.
  const s = (await sheet.boundingBox())!
  expect(s.height / s.width).toBeCloseTo(297 / 210, 2)
  const b = (await box.boundingBox())!
  expect(b.x).toBeGreaterThan(s.x)
  expect(b.x + b.width).toBeLessThan(s.x + s.width)
  expect(b.width / s.width).toBeCloseTo(180 / 210, 2)

  // Zoom in: the paper is wider; the % button fits it back.
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByRole('button', { name: 'Fit width' })).toHaveText(
    '125 %',
  )
  const z = (await sheet.boundingBox())!
  expect(z.width / s.width).toBeCloseTo(1.25, 1)
  await page.getByRole('button', { name: 'Fit width' }).click()
  await expect(page.getByRole('button', { name: 'Fit width' })).toHaveText(
    '100 %',
  )

  // Lots of text: a second sheet appears under the first.
  await expect(page.locator('[data-paper-sheet]')).toHaveCount(1)
  await page.locator('.bn-editor').getByText('Hello paper').click()
  await page.keyboard.press('End')
  for (let i = 0; i < 90; i++) await page.keyboard.press('Enter')
  await expect(page.locator('[data-paper-sheet="2"]')).toBeVisible()
})

test('a tap on empty paper makes a box; it moves, resizes, locks, duplicates and deletes with Undo', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Boxes')
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  // Below the page's text, on the paper: a new box with the caret in it.
  await page.mouse.click(sheet.x + sheet.width * 0.5, main.y + main.height + 60)
  const extra = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  await expect(extra).toHaveCount(1)
  await expect(extra.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Box text')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line')
  await expect(extra).toContainText('Box text')
  await expect(page.locator('[data-paper-box="main"]')).not.toContainText(
    'Box text',
  )
  // Enter grew the box, not the page.
  const b1 = (await extra.boundingBox())!
  expect(b1.height).toBeGreaterThan(40)

  // Drag the grip: the box moves.
  await extra.hover()
  const g = (await extra.locator('[data-box-grip]').boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x - 60, g.y + 80, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(async () => (await extra.boundingBox())!.y)
    .toBeGreaterThan(b1.y + 50)
  // Drag the right edge: it is wider.
  const before = (await extra.boundingBox())!
  const e = (await extra.locator('[data-box-edge="right"]').boundingBox())!
  await page.mouse.move(e.x + e.width / 2, e.y + 10)
  await page.mouse.down()
  await page.mouse.move(e.x + 80, e.y + 10, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(async () => (await extra.boundingBox())!.width)
    .toBeGreaterThan(before.width + 40)

  // Lock: no grip; a reload keeps everything.
  await extra.hover()
  await extra.locator('[data-box-menu]').click()
  await page.getByRole('menuitem', { name: 'Lock in place' }).click()
  await expect(extra.locator('[data-box-grip]')).toHaveCount(0)
  await page.waitForTimeout(800) // autosave
  await page.reload()
  await expect(extra).toHaveCount(1)
  await expect(extra).toHaveAttribute('data-locked', '')
  await expect(extra).toContainText('Second line')

  // Duplicate, then delete the copy and bring it back with Undo.
  await extra.hover()
  await extra.locator('[data-box-menu]').click()
  await page.getByRole('menuitem', { name: 'Duplicate box' }).click()
  await expect(extra).toHaveCount(2)
  await expect(extra.nth(1)).toContainText('Box text')
  await extra.nth(1).hover()
  await extra.nth(1).locator('[data-box-menu]').click()
  await page.getByRole('menuitem', { name: 'Delete box' }).click()
  await expect(extra).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect(extra).toHaveCount(2)
  await expect(extra.nth(1)).toContainText('Second line')
})

test('the Lasso on the paper picks boxes; moving one moves them all', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Lasso boxes')
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const extra = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  const y = main.y + main.height + 50
  for (const [i, fx] of [0.1, 0.55].entries()) {
    await page.mouse.click(sheet.x + sheet.width * fx, y)
    await expect(extra).toHaveCount(i + 1)
    await page.keyboard.type('Box ' + (i + 1))
  }
  await page.waitForTimeout(600)
  const before = await extra.evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().y),
  )
  await tool(page, 'Lasso').click()
  // Close the Lasso's options pill first: a touch on the page closes it and
  // the page then moves up by its height.
  await page.keyboard.press('Escape')
  // The Lasso's pill opens a moment later and the page is held still for a
  // while (R6-8): wait until the boxes stop moving.
  let last = -1
  await expect
    .poll(
      async () => {
        const y = (await extra.first().boundingBox())!.y
        const still = Math.abs(y - last) < 0.5
        last = y
        return still
      },
      { intervals: [300] },
    )
    .toBe(true)
  // A loop round both boxes, drawn on the paper (measured again: choosing a
  // tool may have moved the page).
  const boxes = await extra.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect()
      return { y: r.y, height: r.height }
    }),
  )
  const now = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const top = Math.min(...boxes.map((b) => b.y)) - 30
  const bottom = Math.max(...boxes.map((b) => b.y + b.height)) + 30
  const left = now.x + 8
  const right = now.x + now.width - 8
  await page.mouse.move(left, top)
  await page.mouse.down()
  for (const [px, py] of [
    [right, top],
    [right, bottom],
    [left, bottom],
    [left, top + 2],
  ])
    await page.mouse.move(px, py, { steps: 6 })
  await page.mouse.up()
  await expect(page.locator('[data-picked]')).toHaveCount(2)
  // Drag the first box's grip down: both boxes move.
  const first = extra.first()
  await first.hover()
  const g = (await first.locator('[data-box-grip]').boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2, g.y + 120, { steps: 6 })
  await page.mouse.up()
  await expect
    .poll(async () => {
      const now = await extra.evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect().y),
      )
      return now.every((v, i) => v > before[i] + 60)
    })
    .toBe(true)
})

test('fit width on a phone: the boxes stack under the text in reading order', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Phone')
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main0 = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const extra = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  // Right box first, then a left box on the same row.
  for (const [i, fx] of [0.55, 0.1].entries()) {
    await page.mouse.click(
      sheet.x + sheet.width * fx,
      main0.y + main0.height + 50,
    )
    await expect(extra).toHaveCount(i + 1)
    await page.keyboard.type(i === 0 ? 'Right box' : 'Left box')
  }
  await page.waitForTimeout(600)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('[data-paper-sheet]')).toHaveCount(0)
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await expect(extra.first()).toContainText('Left box')
  await expect(extra.nth(1)).toContainText('Right box')
  const a = (await extra.first().boundingBox())!
  const b = (await extra.nth(1).boundingBox())!
  for (const r of [a, b]) {
    expect(Math.abs(r.x - main.x)).toBeLessThan(2)
    expect(Math.abs(r.width - main.width)).toBeLessThan(2)
  }
  expect(a.y).toBeGreaterThan(main.y + main.height - 1)
  expect(b.y).toBeGreaterThan(a.y + a.height - 1)
  // No sideways scroll on the phone.
  const sw = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(sw).toBeLessThanOrEqual(390)
})
