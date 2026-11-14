// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Task 2B.3 first-look pictures: a selected box (switch textbox.v2 ON) in
 * light, dark and sepia on an iPad upright, iPad sideways and a phone.
 * Written to screenshots/phase-2b/2b3-select/ (see its index.md).
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = 'screenshots/phase-2b/2b3-select'
const SIZES = {
  'ipad-upright': { width: 820, height: 1180 },
  'ipad-sideways': { width: 1180, height: 820 },
} as const
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const

test('2B.3 pictures: a selected box in three themes and three screens', async ({
  page,
}) => {
  mkdirSync(OUT, { recursive: true })
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.setViewportSize({ width: 1180, height: 820 })
  await page.goto('/')
  await createNotebook(page, 'Shots', 'Select')
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 60)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await page.keyboard.type('Photosynthesis: light, water and carbon dioxide')
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(800)
  for (const [size, vp] of Object.entries(SIZES)) {
    await page.setViewportSize(vp)
    await page.waitForTimeout(600)
    for (const [name, theme] of Object.entries(THEMES)) {
      await page.evaluate(
        (th) => document.documentElement.setAttribute('data-theme', th),
        theme,
      )
      const box = page.locator(EXTRA)
      // Deselect (a tap on bare paper), then a first tap on the words selects the box.
      if ((await box.getAttribute('data-picked')) !== null) {
        const sh = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
        const bb = (await box.boundingBox())!
        await page.mouse.click(
          sh.x + sh.width * 0.92,
          Math.min(bb.y + bb.height + 160, vp.height - 60),
        )
        await expect(box).not.toHaveAttribute('data-picked', '')
      }
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
        { x: r.x + 30, y: r.y + r.height / 2 },
      )
      await expect(box).toHaveAttribute('data-picked', '')
      await page.waitForTimeout(250)
      await page.screenshot({ path: `${OUT}/${size}-${name}.png` })
    }
  }
})
