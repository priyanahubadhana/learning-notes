// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { columns, pick, start, tapOut, tapTextEnd } from './cBoxesHelpers.ts'

/**
 * First-look pictures of the box fixes C8 to C16 (switch textbox.v2 ON): the
 * three states of a box (typing, selected, none) in a column layout, in light
 * and dark, on an iPad upright, an iPad sideways and a phone. Written to
 * screenshots/c-boxes/<project>/ (see its INDEX.md).
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const OUT = () => 'screenshots/c-boxes/' + test.info().project.name
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
]
const SIZES: [string, { width: number; height: number }][] = [
  ['ipad-upright', { width: 834, height: 1194 }],
  ['ipad-sideways', { width: 1194, height: 834 }],
  ['phone', { width: 390, height: 844 }],
]

async function look(
  page: Page,
  theme: string,
  size: { width: number; height: number },
) {
  await page.setViewportSize(size)
  await page.evaluate(
    (th) => document.documentElement.setAttribute('data-theme', th),
    theme,
  )
  await page.waitForTimeout(700)
}
for (const [tname, theme] of THEMES)
  for (const [sname, size] of SIZES)
    test('C-boxes pictures: ' + tname + ' ' + sname, async ({ page }) => {
      mkdirSync(OUT(), { recursive: true })
      await start(page, 'Shots')
      const { a } = await columns(page)
      await look(page, theme, size)
      const file = (state: string) => `${OUT()}/${state}-${tname}-${sname}.png`
      await tapOut(page)
      await tapOut(page)
      await page.screenshot({ path: file('3-none') })
      await pick(page, a).catch(() => undefined)
      await page.screenshot({ path: file('2-selected') })
      await tapTextEnd(page, a)
      await page.waitForTimeout(500)
      await page.screenshot({ path: file('1-typing') })
      await expect(page.locator('[data-paper-box]').first()).toBeVisible()
    })
