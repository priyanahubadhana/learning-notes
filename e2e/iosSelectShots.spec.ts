// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { mkdirSync } from 'node:fs'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
  waitForSaved,
} from './helpers.ts'
import { rect } from './cBoxesHelpers.ts'
import {
  installRealPen,
  realPen,
  realPenTaps,
  type PenTap,
  type Pt,
} from './realPen.ts'

/** First-look pictures of F5/F6/F7: screenshots/ios-select/ (index.md lists them). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const FLAGS = [
  'foundation.shell',
  'settings.v3',
  'storage.safety',
  'update.v2',
  'security.m1',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'review.v2',
  'ai.framework',
  'journal.monthRepair',
]
const MAIN = '[data-paper-box="main"]'
const LINE1 = 'Service rate-is on 23-11-2000 done'
const LINE2 = 'Another line of plain words'

async function open(page: Page, mode: 'pencil' | 'touch') {
  await installRealPen(page)
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    FLAGS,
  )
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Old page')
  await typeInEditor(page, 'Old words')
  await addPage(page, 'Paper', 'iOS select')
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  await expect(text).toHaveAttribute('aria-pressed', 'true')
  // Two lines of words, then the caret out of the box.
  const main = page.locator(MAIN)
  const first = await rect(main.locator('.bn-block-content').first())
  await realPen(page, [{ x: first.x + 6, y: first.y + 8 }])
  await expect(main.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(LINE1)
  await expect(page.locator('[data-paper-hint]')).toHaveCount(0)
  await waitForSaved(page)
  await page.waitForTimeout(500)
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type(LINE2)
  await expect(main).toContainText(LINE2)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

type How = 'pen' | 'finger'
type Box = { x: number; y: number; width: number; height: number }

/** The screen box of characters from..to of the first match of `word` in the main box. */
const boxOf = (page: Page, word: string, from = 0, to = word.length) =>
  page.evaluate(
    ({ sel, word, from, to }) => {
      const walker = document.createTreeWalker(
        document.querySelector(sel)!,
        NodeFilter.SHOW_TEXT,
      )
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const i = (n.textContent ?? '').indexOf(word)
        if (i < 0) continue
        const r = document.createRange()
        r.setStart(n, i + from)
        r.setEnd(n, i + to)
        const b = r.getBoundingClientRect()
        return { x: b.x, y: b.y, width: b.width, height: b.height }
      }
      throw new Error('no text ' + word)
    },
    { sel: MAIN, word, from, to },
  ) as Promise<Box>

const centre = (b: Box): Pt => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
const selectedText = (page: Page) =>
  page.evaluate(() => window.getSelection()?.toString() ?? '')
async function tapRun(
  page: Page,
  how: How,
  at: Pt,
  count: number,
  gap: number,
) {
  if (how === 'pen') {
    const taps: PenTap[] = [{ hold: 60 }]
    for (let i = 1; i < count; i++) taps.push({ hold: 60, gap })
    await realPenTaps(page, at, taps)
  } else {
    for (let i = 0; i < count; i++) {
      if (i) await page.waitForTimeout(gap)
      await page.touchscreen.tap(at.x, at.y)
    }
  }
}

const SIZES = {
  'ipad-sideways': { width: 1180, height: 820 },
  'ipad-upright': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
} as const

for (const theme of ['light', 'dark'] as const)
  for (const level of ['Beginner', 'Professional'] as const)
    for (const [size, vp] of Object.entries(SIZES)) {
      test(`pictures: ${theme}, ${level}, ${size}`, async ({ page }, info) => {
        await open(page, 'pencil')
        await page.setViewportSize(vp)
        await page.emulateMedia({ colorScheme: theme })
        await page.evaluate(
          (th) => document.documentElement.setAttribute('data-theme', th),
          theme === 'dark' ? 'night' : 'light',
        )
        await page
          .getByRole('button', { name: level, exact: true })
          .first()
          .click()
        await page.waitForTimeout(600)
        mkdirSync('screenshots/ios-select', { recursive: true })
        const out = (n: string) =>
          `screenshots/ios-select/${info.project.name}-${n}-${theme}-${level.toLowerCase()}-${size}.png`
        // F6: a circle round "rate-is".
        const b = await boxOf(page, 'rate-is')
        const c = centre(b)
        const ring: Pt[] = []
        for (let i = 0; i <= 26; i++) {
          const a = Math.PI + (i / 24) * Math.PI * 2
          ring.push({
            x: c.x + Math.cos(a) * (b.width / 2 + 2),
            y: c.y + Math.sin(a) * (b.height / 2 + 5),
          })
        }
        await realPen(page, ring)
        await expect(page.locator('[data-mini-toolbar]').first()).toBeVisible()
        await page.waitForTimeout(300)
        await page.screenshot({ path: out('f5-f6-circle-strip') })
        // F7: a slow double tap (600 ms) on "plain".
        await page.keyboard.press('Escape')
        const w = await boxOf(page, 'plain')
        await tapRun(page, 'pen', centre(w), 2, 600)
        await expect
          .poll(() => selectedText(page), { timeout: 800 })
          .toBe('plain')
        await page.waitForTimeout(300)
        await page.screenshot({ path: out('f7-double-tap') })
      })
    }
