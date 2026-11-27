// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * First-look pictures of box bar part A (switch textbox.v2): the bar and each
 * strip, iPad sideways first (the owner tests sideways), then upright and a
 * phone; light and dark. Written to screenshots/box-bar-a/ with an INDEX.md.
 */
const OUT = 'screenshots/box-bar-a'
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const SIZES = [
  ['ipad-sideways', 1194, 834],
  ['ipad-upright', 834, 1194],
  ['phone', 390, 844],
] as const
const index: string[] = []

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
      test(`pictures`, async ({ page }) => {
        await page.addInitScript(() =>
          localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
        )
        await startInMode(page, 'touch')
        await page.goto('/')
        await createNotebook(page, 'Paper', `Shots ${label} ${look}`)
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
        await page.mouse.click(r.x + r.width * 0.3, mb.y + mb.height + 60)
        const box = page.locator(EXTRA).first()
        await expect(box.locator('.bn-editor')).toBeFocused()
        await page.keyboard.type('How to read books')
        await page.waitForTimeout(700)
        await page.evaluate(() =>
          (document.activeElement as HTMLElement).blur(),
        )
        await page.waitForTimeout(900)
        await pickIt(page, box)
        const shot = async (name: string) => {
          mkdirSync(OUT, { recursive: true })
          const f = `${label}-${look}-${name}.png`
          await page.screenshot({ path: `${OUT}/${f}` })
          index.push(`- ${f}`)
        }
        await shot('bar')
        const bar = page.locator('[data-box-bar]')
        const steps: [string, string][] = [
          ['Text colour', 'colour'],
          ['Size', 'size'],
          ['Font', 'font'],
          ['Bold and italic', 'bi'],
          ['Align', 'align'],
          ['List', 'list'],
          ['Paste options', 'paste'],
        ]
        for (const [name, id] of steps) {
          const b = bar.getByRole('button', { name, exact: true })
          if (!(await b.count())) continue
          await b.click()
          await shot(id)
          await page
            .locator(`[data-onebar-pop="${id}"]`)
            .getByRole('button', { name: 'Close' })
            .click()
        }
        await bar.getByRole('button', { name: 'Box actions' }).click()
        await shot('more')
        await page.keyboard.press('Escape')
        await pickIt(page, box)
        await bar
          .getByRole('button', { name: 'Box style', exact: true })
          .click()
        await shot('box-style')
        mkdirSync(OUT, { recursive: true })
        writeFileSync(
          `${OUT}/INDEX.md`,
          '# Box bar part A pictures (sideways first)\n\n' +
            [...new Set(index)].sort().join('\n') +
            '\n',
        )
      })
    })
  }
}

async function pickIt(page: Page, box: Locator) {
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
