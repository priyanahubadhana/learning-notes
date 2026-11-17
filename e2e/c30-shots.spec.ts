// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { rect, start, tapEmptyPart } from './cBoxesHelpers.ts'
import { installRealPen, realPen } from './realPen.ts'

/**
 * First-look pictures of C29 and C30 (owner 17 Nov 2026; switch textbox.v2
 * ON), iPad upright, light and dark: a new empty box with no "Type here",
 * a tap next to the words (the caret goes there at once), and a tap in the
 * box's empty part (the box is selected). Written to screenshots/c30/ with
 * an INDEX.md.
 */
test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
]
const OUT = 'screenshots/c30'

const shot = (page: Page, file: string) => {
  mkdirSync(OUT, { recursive: true })
  return page.screenshot({ path: `${OUT}/${file}.png` })
}

const lineEnd = (box: Locator) =>
  box
    .locator('.bn-inline-content')
    .first()
    .evaluate((el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let last: Text | null = null
      for (let n = w.nextNode(); n; n = w.nextNode()) last = n as Text
      const r = document.createRange()
      r.setStart(last!, last!.length - 1)
      r.setEnd(last!, last!.length)
      const b = r.getBoundingClientRect()
      return { right: b.right, mid: (b.top + b.bottom) / 2, fs: 16 }
    })

for (const [label, theme] of THEMES)
  test(`C29 and C30 pictures: iPad upright, ${label}`, async ({ page }) => {
    await installRealPen(page)
    await start(page, `C30 ${label}`)
    await page.evaluate(
      (th) => document.documentElement.setAttribute('data-theme', th),
      theme,
    )
    // C29: a new empty box with the caret in it shows no "Type here".
    const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
    const main = await rect(page.locator('[data-paper-box="main"]'))
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 60,
    )
    await expect(page.locator(EXTRA)).toHaveCount(1)
    await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
    await page.waitForTimeout(500)
    await expect(page.locator(EXTRA)).not.toContainText('Type here')
    await shot(page, `new-box-${label}`)
    await page.keyboard.type('Hello world')
    await page.waitForTimeout(600)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    const box = page.locator(EXTRA)
    // C30: a tap just past the words puts the caret there at once.
    const e = await lineEnd(box)
    await realPen(page, [{ x: e.right + 14, y: e.mid }])
    await page.waitForTimeout(600)
    await expect(box.locator('.bn-editor')).toBeFocused()
    await expect(box).not.toHaveAttribute('data-picked', '')
    await shot(page, `tap-near-words-caret-${label}`)
    // C30: a tap in the empty part selects the box.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    await tapEmptyPart(page, box)
    await expect(box).toHaveAttribute('data-picked', '')
    await page.waitForTimeout(500)
    await shot(page, `tap-empty-part-selected-${label}`)
  })

test.afterAll(() => {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(
    `${OUT}/INDEX.md`,
    [
      '# C29 and C30 pictures (iPad upright, light and dark)',
      '',
      '- new-box-<theme>.png: C29, a new empty box with the caret in it: no "Type here".',
      '- tap-near-words-caret-<theme>.png: C30, a tap just past the words puts the typing cursor there (thin border, no dots).',
      '- tap-empty-part-selected-<theme>.png: C30, a tap in the empty part selects the box (dots, tab, bar).',
      '',
    ].join('\n'),
  )
})
