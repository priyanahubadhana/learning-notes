// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
  waitForSaved,
} from './helpers.ts'
import { rect } from './cBoxesHelpers.ts'
import { installRealPen, realPen, type Pt } from './realPen.ts'
import { replayTrace, traceBounds, type TraceIn } from './circleTrace.ts'

/**
 * The red-line Circle recorder is gone (A2): its panel tests moved to
 * e2e/quietRecorder.spec.ts (R2, R4, RC-02). What stays: the circle rule, and
 * the replay of an old version 1 trace (replayTrace) over "rate-is".
 */
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
const LINE = 'Service rate-is on 23-11-2000 done'

async function open(page: Page, recorder: boolean) {
  await openPage(page)
  if (!recorder) return
  // Switched on in Settings, the page opens again with it: the strokes of
  // setting the page up are not recorded.
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:preview.circleRecorder', '"on"'),
  )
  await page.reload()
  await expect(page.locator(MAIN)).toContainText(LINE)
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  await page.waitForTimeout(900)
}

async function openPage(page: Page) {
  await installRealPen(page)
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    FLAGS,
  )
  await startInMode(page, 'pencil')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Old page')
  await typeInEditor(page, 'Old words')
  await addPage(page, 'Paper', 'Recorder')
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  const main = page.locator(MAIN)
  const first = await rect(main.locator('.bn-block-content').first())
  await realPen(page, [{ x: first.x + 6, y: first.y + 8 }])
  await expect(main.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(LINE)
  await expect(main).toContainText(LINE)
  await waitForSaved(page)
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

const boxOf = (page: Page, word: string) =>
  page.evaluate(
    ({ sel, word }) => {
      const walker = document.createTreeWalker(
        document.querySelector(sel)!,
        NodeFilter.SHOW_TEXT,
      )
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const i = (n.textContent ?? '').indexOf(word)
        if (i < 0) continue
        const r = document.createRange()
        r.setStart(n, i)
        r.setEnd(n, i + word.length)
        const b = r.getBoundingClientRect()
        return { x: b.x, y: b.y, width: b.width, height: b.height }
      }
      throw new Error('no text ' + word)
    },
    { sel: MAIN, word },
  )
const selectedText = (page: Page) =>
  page.evaluate(() => window.getSelection()?.toString() ?? '')

const ring = (c: Pt, rx: number, ry: number): Pt[] =>
  Array.from({ length: 27 }, (_, i) => {
    const a = Math.PI + (i / 24) * Math.PI * 2
    return { x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry }
  })

const circleRateIs = async (page: Page) => {
  const b = await boxOf(page, 'rate-is')
  await realPen(
    page,
    ring({ x: b.x + b.width / 2, y: b.y + b.height / 2 }, b.width / 2 + 1, 12),
  )
}

test('no panel is drawn on the page after a circle (the red-line recorder is gone)', async ({
  page,
}) => {
  await open(page, false)
  await circleRateIs(page)
  await page.waitForTimeout(3500)
  await expect(page.locator('[data-circle-recorder]')).toHaveCount(0)
})

test('replayTrace: a recorded circle (sample trace) placed over "rate-is" selects it', async ({
  page,
}) => {
  const trace = JSON.parse(
    readFileSync(
      new URL('./fixtures/circleTrace.sample.json', import.meta.url),
      'utf8',
    ),
  ) as TraceIn
  await open(page, false)
  const b = await boxOf(page, 'rate-is')
  const t = traceBounds(trace)
  await replayTrace(page, trace, {
    dx: b.x + b.width / 2 - (t.x + t.width / 2),
    dy: b.y + b.height / 2 - (t.y + t.height / 2),
  })
  await expect.poll(() => selectedText(page), { timeout: 1500 }).toBe('rate-is')
})
