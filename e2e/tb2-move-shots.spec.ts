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
 * Task 2B.7 first-look pictures (switch textbox.v2 ON): a box held and lifted
 * over another (outline, the other box slid aside), and just after the drop
 * (toast "Box moved" with Undo). Light, dark and sepia on an iPad upright, an
 * iPad sideways and a phone. Written to screenshots/phase-2b/2b7-move/<project>/
 * (see its index.md). The theme is set on the page and checked before each shot.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () => 'screenshots/phase-2b/2b7-move/' + test.info().project.name
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
  ['sepia', 'sepia'],
]
const SIZES: [
  string,
  { width: number; height: number },
  'computer' | 'touch',
][] = [
  ['ipad-upright', { width: 820, height: 1180 }, 'computer'],
  ['ipad-sideways', { width: 1180, height: 820 }, 'computer'],
  ['phone', { width: 390, height: 844 }, 'touch'],
]

async function theme(page: Page, th: string) {
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-theme', t),
    th,
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', th)
  await page.waitForTimeout(1000)
}

async function addBox(page: Page, text: string, down: number, under?: Locator) {
  const main = (await (
    under ?? page.locator('[data-paper-box="main"]')
  ).boundingBox())!
  const sheetBox = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetBox.count()) ? await sheetBox.boundingBox() : null
  const n = await page.locator(EXTRA).count()
  await page.mouse.click(
    sheet ? sheet.x + sheet.width * 0.12 : 150,
    main.y + main.height + down,
  )
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(page.locator(EXTRA).nth(n).locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return page.locator(EXTRA).nth(n)
}

for (const [name, vp, mode] of SIZES) {
  test('2B.7 pictures: lift and drop, ' + name, async ({ page }) => {
    mkdirSync(OUT(), { recursive: true })
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
    )
    await startInMode(page, mode)
    await page.setViewportSize(vp)
    await page.goto('/')
    await createNotebook(page, 'Shots', 'Move')
    await typeInEditor(page, 'Biology')
    const a = await addBox(page, 'Cell parts: nucleus, membrane', 40)
    const b =
      name === 'phone'
        ? a
        : await addBox(page, 'Quiz me: what does the nucleus do?', 90, a)
    if (name === 'phone') {
      const at = (await b.boundingBox())!
      await page.mouse.click(at.x + at.width / 2, at.y + at.height / 2)
      await expect(b).toHaveAttribute('data-picked', '')
    } else await pickBox(page, b)
    const grips = await b.locator('[data-box-grip]').count()
    if (name === 'phone') {
      // One stacked column: boxes move with the ▲▼ list (2B.8), not by the tab.
      expect(grips).toBe(0)
      for (const [label, th] of THEMES) {
        await theme(page, th)
        await page.screenshot({ path: `${OUT()}/phone-${label}.png` })
      }
      return
    }
    const g = (await b.locator('[data-box-grip]').boundingBox())!
    const gx = g.x + g.width / 2
    const gy = g.y + g.height / 2
    const a0 = (await a.boundingBox())!
    await page.mouse.move(gx, gy)
    await page.mouse.down()
    await page.waitForTimeout(250)
    await page.mouse.move(a0.x + a0.width * 0.85, a0.y + 4, { steps: 12 })
    await page.waitForTimeout(500)
    await expect(b).toHaveAttribute('data-lifted', '')
    await expect(page.locator('[data-grid-ghost]')).toHaveCount(1)
    for (const [label, th] of THEMES) {
      await theme(page, th)
      await page.screenshot({ path: `${OUT()}/lift-${name}-${label}.png` })
    }
    await page.mouse.up()
    await expect(page.getByText('Box moved')).toBeVisible()
    await page.waitForTimeout(500)
    for (const [label, th] of THEMES) {
      await theme(page, th)
      await page.screenshot({ path: `${OUT()}/dropped-${name}-${label}.png` })
    }
  })
}
