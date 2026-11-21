// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  addBox,
  centre,
  drag,
  narrowBox,
  pick,
  rect,
  start,
} from './cBoxesHelpers.ts'
import { installRealPen, realPen } from './realPen.ts'

/**
 * First-look pictures of C28 (a moved box lands in free paper beside a box)
 * and C30b (the first box: selected by a tap in its empty part), iPad upright,
 * light and dark, switch textbox.v2 ON. Written to screenshots/c28-c30b/.
 */
test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  deviceScaleFactor: 2,
})
const OUT = 'screenshots/c28-c30b'
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
]
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
      return { right: b.right, mid: (b.top + b.bottom) / 2 }
    })

for (const [label, theme] of THEMES)
  test(`C28 and C30b pictures: iPad upright, ${label}`, async ({ page }) => {
    await installRealPen(page)
    await start(page, `C28 ${label}`)
    await page.evaluate(
      (th) => document.documentElement.setAttribute('data-theme', th),
      theme,
    )
    // C30b: a tap in the empty part of the first box selects it.
    const main = page.locator('[data-paper-box="main"]')
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)
    const e = await lineEnd(main)
    await realPen(page, [{ x: e.right + 160, y: e.mid }])
    await page.waitForTimeout(600)
    await expect(page.locator('[data-main-chrome]')).toHaveCount(1)
    await shot(page, `first-box-selected-${label}`)
    await page.keyboard.press('Escape')
    // C28: a box moved by its tab to the free paper beside the right column.
    const boxes: Locator[] = []
    for (const [i, n] of ['One', 'Two', 'Three'].entries()) {
      const b = await addBox(page, [n + ' a', n + ' b'], 0.62, 60 + i * 20)
      await narrowBox(page, b, 'w', 300)
      boxes.push(b)
    }
    const top = await rect(boxes[0])
    await pick(page, boxes[1])
    const g = await centre(boxes[1].locator('[data-box-grip]'))
    const m = await rect(boxes[1])
    await drag(page, g, {
      x: g.x - (m.x - 80),
      y: g.y - (m.y - top.y),
    })
    await page.waitForTimeout(800)
    await shot(page, `moved-beside-${label}`)
    mkdirSync(OUT, { recursive: true })
    writeFileSync(
      `${OUT}/INDEX.md`,
      '# C28 / C30b pictures (iPad upright, light and dark)\n\n' +
        '- first-box-selected-*: the first box after a tap in its empty part (frame, dots, tab, menu; no caret)\n' +
        '- moved-beside-*: a box dragged by its tab into the free paper beside the right-hand boxes; the first box and the column stay\n',
    )
  })
