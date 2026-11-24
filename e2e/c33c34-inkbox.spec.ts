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
