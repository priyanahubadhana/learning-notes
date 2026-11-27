// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { card, option, openPill } from './mainBarHelpers.ts'

/**
 * First-look pictures of box bar part B: the grip held (drop zones), docked
 * at the bottom, docked upright on the right, pinned with nothing selected,
 * and the Text tool's size strip. iPad sideways first, then upright, phone;
 * light and dark. Written to screenshots/box-bar-b/.
 */
const OUT = 'screenshots/box-bar-b'
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const SIZES = [
  ['ipad-sideways', 1194, 834],
  ['ipad-upright', 834, 1194],
  ['phone', 390, 844],
] as const

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

for (const [label, w, h] of SIZES) {
  for (const [look, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const) {
    test.describe(`${label} ${look}`, () => {
      test.use({
        viewport: { width: w, height: h },
        hasTouch: true,
        deviceScaleFactor: 2,
      })
      test('pictures', async ({ page }) => {
        mkdirSync(OUT, { recursive: true })
        const shot = (n: string) =>
          page.screenshot({ path: `${OUT}/${label}-${look}-${n}.png` })
        await page.addInitScript(() =>
          localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
        )
        await startInMode(page, 'touch')
        await page.goto('/')
        await createNotebook(page, 'Paper', `B ${label} ${look}`)
        await typeInEditor(page, 'Main text')
        await page.evaluate(
          (th) => document.documentElement.setAttribute('data-theme', th),
          theme,
        )
        const sheet = page.locator('[data-paper-sheet="1"]')
        const r = (await sheet.count())
          ? (await sheet.boundingBox())!
          : (await page.locator('[data-paper-box="main"]').boundingBox())!
        const mb = (await page
          .locator('[data-paper-box="main"]')
          .boundingBox())!
        await page.mouse.click(r.x + r.width * 0.3, mb.y + mb.height + 120)
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
        const grip = page.getByTestId('ob-grip')
        const g = (await grip.boundingBox())!
        await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
        await page.mouse.down()
        await page.mouse.move((area.l + area.r) / 2, area.b - 30, { steps: 8 })
        await shot('drag-zones')
        await page.mouse.up()
        await expect(page.locator('[data-pinned-bar]')).toHaveCount(1)
        await shot('docked-bottom')
        // Right side, upright.
        const g2 = (await page.getByTestId('ob-grip').boundingBox())!
        await page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2)
        await page.mouse.down()
        await page.mouse.move(area.r - 30, (area.t + area.b) / 2, { steps: 8 })
        await page.mouse.up()
        await shot('docked-right')
        // Nothing selected: buttons off.
        await page.keyboard.press('Escape')
        await page.evaluate(() =>
          (document.activeElement as HTMLElement)?.blur(),
        )
        await page.waitForTimeout(300)
        await shot('pinned-nothing-selected')
        // The Text tool's size strip.
        if (w > 700) {
          await openPill(page, 'Text', 'text')
          await option(page, /^Text size/).click()
          await expect(card(page).locator('[data-size-strip]')).toBeVisible()
          await shot('text-tool-size')
        }
      })
    })
  }
}
