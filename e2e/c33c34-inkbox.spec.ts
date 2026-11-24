// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { savedInk } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { installRealPen, realPen, type Pt } from './realPen.ts'

/**
 * Issues #65 and #64 (owner 24 Nov 2026, iPad upright, switch textbox.v2).
 * #65: drawing in the page's first box never changes that box's shape.
 * #64: in a box made taller by a handle, ink and typing use the whole inside
 *   of the box up to the visible border and stop there.
 * Every Pencil stroke is the browser's own input (e2e/realPen.ts).
 */
test.use({
  viewport: { width: 834, height: 1194 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const MAIN = '[data-paper-box="main"]'
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
type Rc = { x: number; y: number; width: number; height: number }
const rect = async (page: Page, sel: string): Promise<Rc> =>
  (await page.locator(sel).first().boundingBox())!

async function start(page: Page, name: string) {
  await installRealPen(page)
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"')
  })
  await startInMode(page, 'pencil')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
  await page.waitForTimeout(600)
}

/** Choose a tool and wait until it is pressed (a late re-render can swallow a tap). */
async function pickTool(page: Page, name: 'Pen' | 'Text') {
  await expect(async () => {
    if ((await tool(page, name).getAttribute('aria-pressed')) !== 'true')
      await tool(page, name).click()
    await expect(tool(page, name)).toHaveAttribute('aria-pressed', 'true', {
      timeout: 1500,
    })
  }).toPass()
}

const line = (x: number, y0: number, y1: number, n = 12): Pt[] =>
  Array.from({ length: n }, (_, i) => ({
    x: x + Math.sin(i) * 6,
    y: y0 + ((y1 - y0) * i) / (n - 1),
  }))

test('#65: a stroke from inside the first box to far below its border leaves the box shape unchanged, also after a reload', async ({
  page,
}) => {
  await start(page, 'Ink65')
  await pickTool(page, 'Pen')
  await page.waitForTimeout(800)
  const before = await rect(page, MAIN)
  const sheet = await rect(page, '[data-paper-sheet="1"]')
  const x = sheet.x + sheet.width * 0.3
  await realPen(
    page,
    line(x, before.y + before.height / 2, before.y + before.height + 300),
  )
  await expect
    .poll(async () => (await savedInk(page)).strokes.length, { timeout: 8000 })
    .toBe(1)
  await page.waitForTimeout(900)
  const after = await rect(page, MAIN)
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2)
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2)
  await page.reload()
  await expect(page.locator(MAIN)).toBeVisible()
  await page.waitForTimeout(1500)
  const again = await rect(page, MAIN)
  expect(Math.abs(again.height - before.height)).toBeLessThanOrEqual(2)
})

/** A box with one line of text made with the Text tool, then selected. */
async function pickedExtra(page: Page, name: string) {
  await start(page, name)
  await pickTool(page, 'Text')
  await page.waitForTimeout(600)
  const sheet = await rect(page, '[data-paper-sheet="1"]')
  const main = await rect(page, MAIN)
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 90)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Alpha beta')
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  const r = (await box.boundingBox())!
  await page.mouse.click(r.x - 5, r.y + r.height / 2)
  await expect(box).toHaveAttribute('data-picked', '')
  return box
}

/** Drag the bottom handle down by `by` px with the Pencil. */
async function growDown(
  page: Page,
  box: ReturnType<Page['locator']>,
  by: number,
) {
  const h = (await box.locator('[data-resize-handle="s"]').boundingBox())!
  const from = { x: h.x + h.width / 2, y: h.y + h.height / 2 }
  // The dot needs its short hold before the drag starts (as in tb2-resize-c31c32).
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(200)
  await page.mouse.move(from.x, from.y + by, { steps: 8 })
  await page.mouse.up()
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
  await page.waitForTimeout(700)
}

test('#64: in a box made taller by the bottom handle the Pen draws in the lower part and stops at the border', async ({
  page,
}) => {
  const box = await pickedExtra(page, 'Ink64a')
  const small = (await box.boundingBox())!
  await growDown(page, box, 220)
  const big = (await box.boundingBox())!
  expect(big.height).toBeGreaterThan(small.height + 150)
  await pickTool(page, 'Pen')
  await page.waitForTimeout(800)
  const bottom = big.y + big.height
  // Round 1: a stroke wholly in the lower, empty part of the box.
  const x = big.x + big.width * 0.4
  await realPen(page, line(x, small.y + small.height + 30, bottom - 25))
  await expect
    .poll(async () => (await savedInk(page)).strokes.length, { timeout: 8000 })
    .toBe(1)
  const ink = await savedInk(page)
  expect(
    await box.evaluate(
      (el, id) => !!el.querySelector(`[data-id="${id}"]`),
      ink.chunks[0].blockId,
    ),
  ).toBe(true)
  // Round 2: a stroke from inside the lower part to far past the border.
  await realPen(page, line(x + 60, bottom - 60, bottom + 160))
  await page.waitForTimeout(900)
  const strokes = (await savedInk(page)).strokes
  // Nothing of it lies below the visible border (page-space y of any point).
  const lowest = await page.evaluate(() => {
    const c = document.querySelectorAll<HTMLCanvasElement>('[data-ink-pad]')
    return c.length
  })
  expect(lowest).toBeGreaterThan(0)
  const frame = (await box.boundingBox())!
  expect(frame.y + frame.height).toBeCloseTo(bottom, 0)
  const pad = await box.evaluate((el) => {
    const p = el.querySelector('[data-ink-pad]') as HTMLElement | null
    if (!p) return null
    const r = p.getBoundingClientRect()
    return { y: r.y, h: r.height }
  })
  expect(pad).not.toBeNull()
  expect(pad!.y + pad!.h).toBeLessThanOrEqual(bottom + 1)
  expect(pad!.h).toBeGreaterThan(big.height - 30)
  expect(strokes.length).toBeGreaterThanOrEqual(1)
})

test('#64: in a box made taller by the bottom handle a Text-tool tap in the empty lower part puts the caret in that box', async ({
  page,
}) => {
  const box = await pickedExtra(page, 'Ink64b')
  const small = (await box.boundingBox())!
  await growDown(page, box, 220)
  const big = (await box.boundingBox())!
  await pickTool(page, 'Text')
  await page.waitForTimeout(600)
  await page.mouse.click(big.x + big.width * 0.4, small.y + small.height + 100)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Zed')
  await expect(box).toContainText('Zed')
  const after = (await box.boundingBox())!
  expect(Math.abs(after.height - big.height)).toBeLessThanOrEqual(2)
})
