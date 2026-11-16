// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import {
  EXTRA,
  colourBoxes,
  columns,
  pick,
  start,
  tapOut,
  tapTextEnd,
} from './cBoxesHelpers.ts'

/** The five preview switches of the first look (the preview preset). */
const FLAGS = [
  'foundation.shell',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
]
// The owner's boxes: brown, green and blue fills.
const FILLS = ['#8b5a2b', '#3a9d5d', '#3b6fd4']

/**
 * First-look pictures of the box fixes C8 to C16 (switch textbox.v2 ON): the
 * three states of a box (typing, selected, none) in a column layout, in light
 * and dark, on an iPad upright, an iPad sideways and a phone. Written to
 * screenshots/c-boxes/<project>/ (see its INDEX.md).
 */
test.use({
  viewport: { width: 1336, height: 1400 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

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
      await start(page, 'Shots', true, FLAGS)
      // Room above the first box for its bar.
      await columns(page, 3, 260)
      await colourBoxes(page, 'Shots', FILLS)
      const a = page.locator(EXTRA).first()
      // The "Box moved" toast of the drop that made the layout is gone.
      await expect(page.locator('[data-toast]')).toHaveCount(0, {
        timeout: 20_000,
      })
      await look(page, theme, size)
      await a.scrollIntoViewIfNeeded()
      const file = (state: string) => `${OUT()}/${state}-${tname}-${sname}.png`
      await out(page, sname)
      await out(page, sname)
      await expect(a).not.toHaveAttribute('data-picked', '')
      await page.screenshot({ path: file('3-none') })
      // A phone has no frame strips: the first tap on a box's text selects it.
      if (sname === 'phone') await tapTextEnd(page, a)
      else await pick(page, a)
      await expect(a).toHaveAttribute('data-picked', '')
      await expect(a).not.toHaveAttribute('data-typing', '')
      await page.waitForTimeout(400)
      await page.screenshot({ path: file('2-selected') })
      await tapTextEnd(page, a)
      await expect(a).toHaveAttribute('data-typing', '')
      await page.waitForTimeout(500)
      await page.screenshot({ path: file('1-typing') })
    })

/** Deselect: a tap on bare paper; on a phone (a tap there makes a new box) Escape. */
async function out(page: Page, size: string) {
  if (size !== 'phone') return tapOut(page)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}
