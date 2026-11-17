// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { rect, start } from './cBoxesHelpers.ts'
import { startInMode } from './helpers.ts'

/**
 * First-look pictures of C33 and C34 (switch textbox.v2 ON), iPad upright,
 * light and dark: the empty page's first box, after 3 lines, and selected.
 * Written to screenshots/c33-c34/<project>/ (e2e/shots is not a test).
 */
test.use({ viewport: { width: 834, height: 1194 }, hasTouch: true })
const FLAGS = [
  'foundation.shell',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
]
const MAIN = '[data-paper-box="main"]'

for (const [tname, theme] of [
  ['light', 'day'],
  ['dark', 'night'],
] as const)
  test('C33/C34 pictures: ' + tname, async ({ page }, info) => {
    const out = `screenshots/c33-c34/${info.project.name}`
    mkdirSync(out, { recursive: true })
    await startInMode(page, 'touch')
    await start(page, 'Shots', false, FLAGS)
    await page.evaluate(
      (th) => document.documentElement.setAttribute('data-theme', th),
      theme,
    )
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${out}/1-empty-${tname}.png` })
    const r = await rect(page.locator(MAIN))
    // Away from the caret spot: selected, no caret (C34).
    await page.mouse.click(r.x + r.width / 2, r.y + 12)
    await expect(
      page.locator('[data-main-chrome] [data-box-grip]'),
    ).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}/3-selected-${tname}.png` })
    await page.keyboard.press('Escape')
    await page.mouse.click(r.x + 6, r.y + 12)
    await page.keyboard.type('One')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Two')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Three')
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${out}/2-three-lines-${tname}.png` })
  })
