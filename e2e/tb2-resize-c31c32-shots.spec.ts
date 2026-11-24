// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * C31 and C32 first-look pictures (switch textbox.v2 ON): a selected box
 * (the tab above the top dot), the top dot held and dragged, and the tab
 * dragged (the box moves, its size stays). iPad upright, light and dark.
 * Written to screenshots/c31-c32/<project>/.
 */
test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () => 'screenshots/c31-c32/' + test.info().project.name
const rect = async (l: Locator) => (await l.boundingBox())!
const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}

async function theme(page: Page, th: string) {
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-theme', t),
    th,
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', th)
}

for (const [name, th] of [
  ['light', 'day'],
  ['dark', 'night'],
] as const)
  test(`C31 C32 pictures ${name}`, async ({ page }) => {
    mkdirSync(OUT(), { recursive: true })
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
    )
    await startInMode(page, 'computer')
    await page.goto('/')
    await createNotebook(page, 'Paper', 'C31C32' + name)
    await typeInEditor(page, 'Main text')
    const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
    const main = await rect(page.locator('[data-paper-box="main"]'))
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 120,
    )
    const box = page.locator(EXTRA)
    await expect(box.locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('Alpha beta')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Gamma')
    await page.waitForTimeout(700)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.waitForTimeout(900)
    await pickBox(page, box)
    const e = await centre(box.locator('[data-resize-handle="e"]'))
    await page.mouse.move(e.x, e.y)
    await page.mouse.down()
    await page.waitForTimeout(160)
    await page.mouse.move(e.x - 300, e.y, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    await theme(page, th)
    // The bar slides in; the picture waits for it to stop.
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT()}/selected-${name}.png` })
    // The top dot held and dragged up.
    const n = await centre(
      box.locator('[data-resize-handle="n"] [data-handle-dot]'),
    )
    await page.mouse.move(n.x, n.y)
    await page.mouse.down()
    await page.waitForTimeout(160)
    await page.mouse.move(n.x, n.y - 40, { steps: 8 })
    await page.screenshot({ path: `${OUT()}/top-dot-dragged-${name}.png` })
    await page.mouse.up()
    await page.waitForTimeout(500)
    // The tab dragged: the box moves, its size stays.
    const g = await centre(box.locator('[data-box-grip]'))
    await page.mouse.move(g.x, g.y)
    await page.mouse.down()
    await page.waitForTimeout(160)
    await page.mouse.move(g.x + 60, g.y + 50, { steps: 8 })
    await page.screenshot({ path: `${OUT()}/tab-dragged-${name}.png` })
    await page.mouse.up()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT()}/after-move-${name}.png` })
  })
