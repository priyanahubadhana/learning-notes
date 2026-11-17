// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Task 2B.3 first-look pictures: a selected box (switch textbox.v2 ON) in
 * light, dark and sepia on an iPad upright, an iPad sideways and a phone.
 * Written to screenshots/phase-2b/2b3-select/ (see its index.md). The theme is
 * set on the page before each shot.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () => 'screenshots/phase-2b/2b3-select/' + test.info().project.name
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
  ['sepia', 'sepia'],
]
type Size = { width: number; height: number }

async function shoot(
  page: Page,
  name: string,
  [label, theme]: [string, string],
  vp: Size,
) {
  await page.setViewportSize(vp)
  await page.evaluate(
    (th) => document.documentElement.setAttribute('data-theme', th),
    theme,
  )
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  // Escape deselects the box from the last shot (the next tap selects it again).
  await page.keyboard.press('Escape')
  await expect(box).not.toHaveAttribute('data-picked', '')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  // Why: the next tap is made at the same spot as the last shot's. Within the
  // tap gap (700 ms since C19) it would count as that tap's second, not a first.
  await page.waitForTimeout(800)
  await box.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  const r = (await box.boundingBox())!
  await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y)!
      for (const type of ['pointerdown', 'pointerup'])
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerType: 'touch',
            pointerId: 7,
            isPrimary: true,
            clientX: x,
            clientY: y,
            buttons: type === 'pointerdown' ? 1 : 0,
            bubbles: true,
            cancelable: true,
          }),
        )
    },
    { x: r.x + r.width - 30, y: r.y + r.height / 2 },
  )
  await expect(box).toHaveAttribute('data-picked', '')
  // The whole box is selected: 8 dots and the tab, no caret.
  // (2B.5b, docs/CHANGELOG.md: dots and the same rules on a phone too.)
  await expect(box.locator('[data-resize-handle]')).toHaveCount(8)
  if (vp.width >= 480)
    await expect(box.locator('[data-box-grip]')).toBeVisible()
  await expect(box.locator('.bn-editor')).not.toBeFocused()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT()}/${name}-${label}.png` })
}

async function prepare(page: Page, mode: 'computer' | 'touch', vp: Size) {
  mkdirSync(OUT(), { recursive: true })
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, mode)
  await page.setViewportSize(vp)
  await page.goto('/')
  await createNotebook(page, 'Shots', 'Select')
  await typeInEditor(page, 'Main text')
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const hasSheet = (await page.locator('[data-paper-sheet="1"]').count()) > 0
  const sheet = hasSheet
    ? await page.locator('[data-paper-sheet="1"]').boundingBox()
    : null
  // Wide screens: a tap on paper. Phone (no sheet): a tap in the gap.
  await page.mouse.click(
    sheet ? sheet.x + sheet.width * 0.3 : 195,
    main.y + main.height + (sheet ? 60 : 40),
  )
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Photosynthesis: light, water and carbon dioxide')
  await page.waitForTimeout(900)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
}

test('2B.3 pictures: iPad upright and sideways', async ({ page }) => {
  const upright = { width: 820, height: 1180 }
  await prepare(page, 'computer', upright)
  for (const t of THEMES) await shoot(page, 'ipad-upright', t, upright)
  for (const t of THEMES)
    await shoot(page, 'ipad-sideways', t, { width: 1180, height: 820 })
})

test('2B.3 pictures: phone', async ({ page }) => {
  const phone = { width: 390, height: 844 }
  await prepare(page, 'touch', phone)
  for (const t of THEMES) await shoot(page, 'phone', t, phone)
})
