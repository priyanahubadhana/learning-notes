// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
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
 * Circle recorder (preview switch): after a Pencil circle in a text box the
 * panel shows the events and a JSON trace; the trace replays (replayTrace)
 * and the generous circle rule selects the circled words.
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

test('recorder ON: a Pencil circle shows the panel with events and a JSON trace', async ({
  page,
}) => {
  await open(page, true)
  await circleRateIs(page)
  const panel = page.locator('[data-circle-recorder]')
  await expect(panel).toBeVisible({ timeout: 8000 })
  const text = await page.locator('[data-circle-recorder-text]').inputValue()
  expect(text).toContain('pointer events: pointerdown 1')
  expect(text).toContain('our loop: isLoop true')
  expect(text).toContain('visualViewport')
  expect(text).toContain('ancestor')
  const trace = JSON.parse(text.split('--- JSON ---\n')[1]) as TraceIn
  expect(
    trace.events.some(
      (e) => e.type === 'pointerdown' && e.pointerType === 'pen',
    ),
  ).toBe(true)
  expect(
    trace.events.filter((e) => e.type === 'pointermove').length,
  ).toBeGreaterThan(5)
  expect(trace.events.some((e) => e.type === 'selectionchange')).toBe(true)
  await expect(page.locator('[data-circle-recorder-svg] polyline')).toHaveCount(
    1,
  )
  await expect(page.locator('[data-circle-recorder-svg] rect')).toHaveCount(1)
  if (process.env.WRITE_TRACE)
    writeFileSync(process.env.WRITE_TRACE, JSON.stringify(trace))
  // The closing cross removes the panel.
  await panel.getByRole('button', { name: '✕' }).click()
  await expect(panel).toHaveCount(0)
})

test('recorder ON: a finger double tap is recorded with click events and who cancelled what', async ({
  page,
}) => {
  await open(page, true)
  const w = await boxOf(page, 'Service')
  const at = { x: w.x + w.width / 2, y: w.y + w.height / 2 }
  await page.touchscreen.tap(at.x, at.y)
  await page.waitForTimeout(150)
  await page.touchscreen.tap(at.x, at.y)
  // A word written over the selection (what Scribble sends is beforeinput / input).
  await page.keyboard.type('Q')
  const panel = page.locator('[data-circle-recorder]')
  await expect(panel).toBeVisible({ timeout: 8000 })
  const text = await page.locator('[data-circle-recorder-text]').inputValue()
  const trace = JSON.parse(text.split('--- JSON ---\n')[1]) as {
    events: { type: string; cancelable?: boolean; dp?: boolean }[]
  }
  const types = trace.events.map((e) => e.type)
  expect(types).toContain('pointerdown')
  expect(types).toContain('click')
  expect(types).toContain('beforeinput')
  expect(text).toContain('insertText')
  expect(trace.events.find((e) => e.type === 'pointerdown')?.cancelable).toBe(
    true,
  )
  // Box-select taps: which box, whether the window saw it after the page, the tool.
  const down = trace.events.find((e) => e.type === 'pointerdown') as
    { box?: string; reached?: boolean; tool?: string } | undefined
  expect(down?.box).toBe('main')
  expect(down?.reached).toBe(true)
  expect(down?.tool).toBeTruthy()
})

test('recorder OFF: no panel after a circle', async ({ page }) => {
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
