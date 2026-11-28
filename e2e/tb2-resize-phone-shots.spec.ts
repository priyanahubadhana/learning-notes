// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { mkdirSync } from 'node:fs'
import { selectByMiddleTap } from './cBoxesHelpers.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Task 2B.5b first-look pictures (phone) (switch textbox.v2 ON): a selected narrow box
 * (dots outside the text, lines apart) and the same box while a dot is held
 * and dragged (the dot has grown). Light, dark and sepia on a phone.
 * Written to screenshots/phase-2b/2b5b-phone-resize/
 * <project>/ (see its index.md). The theme is set on the page and checked
 * before each shot.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () =>
  'screenshots/phase-2b/2b5b-phone-resize/' + test.info().project.name
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
  ['sepia', 'sepia'],
]
const SIZES: [string, { width: number; height: number }, 'touch'][] = [
  ['phone', { width: 390, height: 844 }, 'touch'],
]

async function theme(page: Page, th: string) {
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-theme', t),
    th,
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', th)
}

for (const [name, vp, mode] of SIZES) {
  test('2B.5b pictures: dots and lines, ' + name, async ({ page }) => {
    mkdirSync(OUT(), { recursive: true })
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
    )
    await startInMode(page, mode)
    await page.setViewportSize(vp)
    await page.goto('/')
    await createNotebook(page, 'Shots', 'Resize')
    await typeInEditor(page, 'Main text')
    const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
    const sheetBox = page.locator('[data-paper-sheet="1"]')
    const sheet = (await sheetBox.count()) ? await sheetBox.boundingBox() : null
    await page.mouse.click(
      sheet ? sheet.x + sheet.width * 0.3 : 150,
      main.y + main.height + (sheet ? 120 : 60),
    )
    await expect(page.locator(EXTRA)).toHaveCount(1)
    await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
    await page.keyboard.type('Photosynthesis: light, water and carbon dioxide')
    await page.waitForTimeout(900)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.waitForTimeout(900)
    const box = page.locator(EXTRA)
    await box.evaluate((e) => e.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(400)
    // C30 (owner 17 Nov): a tap on the words puts the caret there; the box is
    // selected by a tap in its empty part (or by this tap plus one outside).
    await selectByMiddleTap(page, box)
    const dots = await box.locator('[data-resize-handle]').count()
    expect(dots).toBe(8)
    // Make it narrow so the text wraps into lines.
    if (dots) {
      const e = (await box.locator('[data-resize-handle="e"]').boundingBox())!
      const ex = e.x + e.width / 2
      const ey = e.y + e.height / 2
      await page.mouse.move(ex, ey)
      await page.mouse.down()
      await page.waitForTimeout(200)
      await page.mouse.move(ex - 140, ey, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(700)
    }
    for (const [label, th] of THEMES) {
      await theme(page, th)
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT()}/narrow-${name}-${label}.png` })
    }
    if (!dots) return
    // Held and dragged: the dot grows while the finger is down.
    const s = (await box.locator('[data-resize-handle="s"]').boundingBox())!
    const sx = s.x + s.width / 2
    const sy = s.y + s.height / 2
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.waitForTimeout(250)
    await page.mouse.move(sx, sy + 30, { steps: 5 })
    await expect(box.locator('[data-resize-handle="s"]')).toHaveAttribute(
      'data-held',
      '',
    )
    for (const [label, th] of THEMES) {
      await theme(page, th)
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT()}/held-${name}-${label}.png` })
    }
    await page.mouse.up()
  })
}
