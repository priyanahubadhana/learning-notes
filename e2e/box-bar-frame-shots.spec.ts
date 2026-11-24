// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import {
  createNotebook,
  openSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * First-look pictures for issues #60 to #63 (box bar in the page column):
 * docked on the right, and folded when the Notebooks sidebar opens. iPad
 * upright, light and dark. Written to screenshots/box-bar-frame/.
 */
const OUT = 'screenshots/box-bar-frame'
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'

async function pickIt(page: Page) {
  const box = page.locator(EXTRA).first()
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape')
  const p = await box.locator('.bn-editor').evaluate((ed) => {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    return { x: ed.getBoundingClientRect().right - 14, y: b.y + b.height / 2 }
  })
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)!
    const mk = (type: string, buttons: number) =>
      new PointerEvent(type, {
        pointerType: 'touch',
        pointerId: 32,
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    el.dispatchEvent(mk('pointerdown', 1))
    el.dispatchEvent(mk('pointerup', 0))
  }, p)
  await expect(box).toHaveAttribute('data-picked', '')
}

const SIZES = [
  ['ipad-upright', 834, 1194],
  ['ipad-sideways', 1194, 834],
  // The sidebar is a drawer over the page here (the owner's real case, #60).
  ['overlay-upright', 600, 1000],
] as const
for (const [label, w, h] of SIZES)
  for (const level of ['beginner', 'professional'] as const)
    for (const [look, theme] of [
      ['light', 'day'],
      ['dark', 'night'],
    ] as const) {
      test.describe(`${label} ${level} ${look}`, () => {
        test.use({
          viewport: { width: w, height: h },
          hasTouch: true,
          deviceScaleFactor: 2,
        })
        test('pictures', async ({ page }) => {
          mkdirSync(OUT, { recursive: true })
          const shot = (n: string) =>
            page.screenshot({
              path: `${OUT}/${label}-${level}-${look}-${n}.png`,
            })
          await page.addInitScript((lv) => {
            localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({ level: lv, unlocked: [], off: [] }),
            )
          }, level)
          await startInMode(page, 'touch')
          await page.goto('/')
          await createNotebook(page, 'Paper', `F ${look}`)
          await typeInEditor(page, 'Main text')
          await page.evaluate(
            (th) => document.documentElement.setAttribute('data-theme', th),
            theme,
          )
          const mb = (await page
            .locator('[data-paper-box="main"]')
            .boundingBox())!
          await page.mouse.click(mb.x + mb.width * 0.3, mb.y + mb.height + 120)
          await expect(
            page.locator(EXTRA).first().locator('.bn-editor'),
          ).toBeFocused()
          await page.keyboard.type('How to read books')
          await page.waitForTimeout(700)
          await page.evaluate(() =>
            (document.activeElement as HTMLElement).blur(),
          )
          await page.waitForTimeout(900)
          await pickIt(page)
          const area = await page.evaluate(() => {
            const a = document.querySelector('main')!.getBoundingClientRect()
            return { l: a.left, t: a.top, r: a.right, b: a.bottom }
          })
          const g = (await page.getByTestId('ob-grip').boundingBox())!
          await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
          await page.mouse.down()
          await page.mouse.move(area.r - 80, (area.t + area.b) / 2, {
            steps: 8,
          })
          await page.mouse.up()
          await expect(page.locator('[data-pinned-bar]')).toHaveCount(1)
          await shot('docked-right')
          await openSidebar(page)
          await page.waitForTimeout(800)
          await shot('sidebar-open-folded')
        })
      })
    }
