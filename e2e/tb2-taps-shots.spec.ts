// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Task 2B.4 first-look pictures (switch textbox.v2 ON): the one writing hint on
 * an empty page, and a word selected by a double-tap in a selected box. Light,
 * dark and sepia on an iPad upright, an iPad sideways and a phone. Written to
 * screenshots/phase-2b/2b4-taps/<project>/ (see its index.md). The theme is set
 * on the page and checked before each shot.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () => 'screenshots/phase-2b/2b4-taps/' + test.info().project.name
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
  ['sepia', 'sepia'],
]
// Where the box bar lands differs by browser: pick the word it does not cover.
const WORD = () =>
  test.info().project.name === 'ipad-webkit' ? 'dioxide' : 'Photosynthesis'
type Size = { width: number; height: number }

async function theme(page: Page, th: string) {
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-theme', t),
    th,
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', th)
}

function send(page: Page, type: string, x: number, y: number) {
  return page.evaluate(
    ({ type, x, y }) => {
      document.elementFromPoint(x, y)!.dispatchEvent(
        new PointerEvent(type, {
          pointerType: 'touch',
          pointerId: 9,
          isPrimary: true,
          clientX: x,
          clientY: y,
          buttons: type === 'pointerdown' ? 1 : 0,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    { type, x, y },
  )
}

async function start(page: Page, mode: 'computer' | 'touch', vp: Size) {
  mkdirSync(OUT(), { recursive: true })
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, mode)
  await page.setViewportSize(vp)
  await page.goto('/')
  await createNotebook(page, 'Shots', 'Taps')
}

const SIZES: [string, Size][] = [
  ['ipad-upright', { width: 820, height: 1180 }],
  ['ipad-sideways', { width: 1180, height: 820 }],
  ['phone', { width: 390, height: 844 }],
]

// Each size is loaded as its own page (the phone has its own layout).
for (const [name, vp] of SIZES) {
  test(
    '2B.4 pictures: the one hint on an empty page, ' + name,
    async ({ page }) => {
      await start(page, 'touch', vp)
      for (const [label, th] of THEMES) {
        await theme(page, th)
        // One hint at a time: the paper's hint, or on a phone the line below.
        await expect(
          page.locator('[data-paper-hint], .ln-tap-below'),
          name + ' ' + label,
        ).toHaveCount(1)
        await page.waitForTimeout(300)
        await page.screenshot({ path: `${OUT()}/hint-${name}-${label}.png` })
      }
    },
  )
}

async function wordShots(
  page: Page,
  mode: 'computer' | 'touch',
  name: string,
  vp: Size,
) {
  await start(page, mode, vp)
  await typeInEditor(page, 'Main text')
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const sheetBox = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetBox.count()) ? await sheetBox.boundingBox() : null
  await page.mouse.click(
    sheet ? sheet.x + sheet.width * 0.3 : 195,
    main.y + main.height + (sheet ? 220 : 40),
  )
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Photosynthesis: light, water and carbon dioxide')
  await page.waitForTimeout(900)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  const box = page.locator(EXTRA)
  for (const [label, th] of THEMES) {
    await theme(page, th)
    await page.keyboard.press('Escape')
    await expect(box).not.toHaveAttribute('data-picked', '')
    await box.evaluate((e) => e.scrollIntoView({ block: 'end' }))
    await page.waitForTimeout(600)
    // The word to double-tap (see WORD): find it on screen.
    const where = () =>
      page.evaluate((word) => {
        const ed = document.querySelector(
          '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
        )!
        const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          const i = (n.textContent ?? '').indexOf(word)
          if (i < 0) continue
          const r = document.createRange()
          r.setStart(n, i + 1)
          r.setEnd(n, i + 2)
          const b = r.getBoundingClientRect()
          return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
        }
        return null
      }, WORD())
    const at = await where()
    expect(at).not.toBeNull()
    // First tap selects the box; then a double-tap selects the word.
    await send(page, 'pointerdown', at!.x, at!.y)
    await send(page, 'pointerup', at!.x, at!.y)
    await expect(box).toHaveAttribute('data-picked', '')
    await page.waitForTimeout(700)
    // The box may have moved when it was selected: measure the word again.
    const at2 = (await where())!
    for (let i = 0; i < 2; i++) {
      if (i) await page.waitForTimeout(120)
      await send(page, 'pointerdown', at2.x, at2.y)
      await send(page, 'pointerup', at2.x, at2.y)
    }
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString()))
      .toBe(WORD())
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT()}/word-${name}-${label}.png` })
  }
}

test('2B.4 pictures: a word selected, iPad upright', async ({ page }) => {
  await wordShots(page, 'computer', 'ipad-upright', {
    width: 820,
    height: 1180,
  })
})

test('2B.4 pictures: a word selected, iPad sideways', async ({ page }) => {
  await wordShots(page, 'computer', 'ipad-sideways', {
    width: 1180,
    height: 820,
  })
})

test('2B.4 pictures: a word selected, phone', async ({ page }) => {
  await wordShots(page, 'touch', 'phone', { width: 390, height: 844 })
})
