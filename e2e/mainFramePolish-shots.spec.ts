// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { addBox, narrowBox, selectMain, start } from './cBoxesHelpers.ts'

/** Polish 2B pictures: the first box selected, typing, and with a box beside it. */
test.use({ hasTouch: true, deviceScaleFactor: 2 })
const OUT = 'screenshots/main-frame'
const SIZES: [string, number, number][] = [
  ['ipad-upright', 820, 1180],
  ['ipad-sideways', 1180, 820],
]
const shot = (page: Page, f: string) => {
  mkdirSync(OUT, { recursive: true })
  return page.screenshot({ path: `${OUT}/${f}.png` })
}
for (const [size, w, h] of SIZES)
  for (const [label, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ])
    test(`main frame ${size} ${label}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      await start(page, `Main ${size} ${label}`)
      await page.evaluate(
        (t) => document.documentElement.setAttribute('data-theme', t),
        theme,
      )
      const main = page.locator('[data-paper-box="main"]')
      await main.locator('.bn-editor').click()
      await page.waitForTimeout(500)
      await shot(page, `${size}-${label}-typing`)
      await selectMain(page)
      await page.waitForTimeout(300)
      await shot(page, `${size}-${label}-selected`)
      const b = await addBox(page, ['Beside', 'box'], 0.62, 60)
      await narrowBox(page, b, 'w', 300)
      await selectMain(page)
      await page.waitForTimeout(500)
      await shot(page, `${size}-${label}-with-box`)
    })
