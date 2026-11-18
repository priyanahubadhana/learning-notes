// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { rect } from './cBoxesHelpers.ts'
import { installRealPen, realPen, realPenTaps } from './realPen.ts'

/**
 * Re-test 18 Nov, "3-step check 2" (F1 to F4), the page's FIRST box with
 * textbox.v2 on, iPad sideways, on a page made through the sidebar's Add page
 * inside a notebook that already has pages. Pencil first (the owner's iOS bars
 * came with the Apple Pencil), then a finger; Pencil and Touch device modes.
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
  await addPage(page, 'Paper', 'First box tap')
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  await expect(text).toHaveAttribute('aria-pressed', 'true')
}

type How = 'pen' | 'finger'
/** One tap the way the owner's hand makes it. */
async function tap(page: Page, how: How, x: number, y: number) {
  if (how === 'pen') await realPen(page, [{ x, y }])
  else await page.touchscreen.tap(x, y)
}
/** A double tap at one spot. */
async function doubleTap(page: Page, how: How, x: number, y: number) {
  if (how === 'pen')
    await realPenTaps(page, { x, y }, [{ hold: 60 }, { hold: 60, gap: 90 }])
  else {
    await page.touchscreen.tap(x, y)
    await page.waitForTimeout(80)
    await page.touchscreen.tap(x, y)
  }
}

/** The first box with two lines (a heading line and a text line), then blurred. */
async function withWords(page: Page) {
  const main = page.locator(MAIN)
  const first = await rect(main.locator('.bn-block-content').first())
  await realPen(page, [{ x: first.x + 6, y: first.y + 8 }])
  await page.keyboard.type('Heading words')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line of words')
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

const caretIn = (page: Page) =>
  page.evaluate(
    (sel) => !!document.querySelector(sel)?.contains(document.activeElement),
    MAIN,
  )
const selectedText = (page: Page) =>
  page.evaluate(() => window.getSelection()?.toString() ?? '')

/** Records which events the page cancelled (preventDefault) from now on. */
const watchCancels = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __cancelled: string[]; __pd: boolean }
    w.__cancelled = []
    if (w.__pd) return
    w.__pd = true
    const orig = Event.prototype.preventDefault
    Event.prototype.preventDefault = function (this: Event) {
      if (this.cancelable) w.__cancelled.push(this.type)
      return orig.call(this)
    }
  })
const cancelled = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __cancelled: string[] }).__cancelled,
  )

const MODES = ['pencil', 'touch'] as const
const HOWS = ['pen', 'finger'] as const

for (const mode of MODES)
  for (const how of HOWS) {
    const name = `${mode} mode, ${how}`

    test(`F1 ${name}: the empty first box keeps "Type, or tap anywhere" until typing starts`, async ({
      page,
    }) => {
      await open(page, mode)
      const hint = page.locator('[data-paper-hint]')
      await expect(hint).toContainText('Type, or tap anywhere')
      const b = await rect(page.locator(MAIN))
      const line = await rect(page.locator(`${MAIN} .bn-block-content`).first())
      // Tapped away from the caret spot: the box is selected, the hint stays.
      await tap(page, how, b.x + b.width - 16, line.y + line.height / 2)
      await page.waitForTimeout(700)
      await expect(page.locator(MAIN)).toHaveAttribute('data-main-picked', '')
      await expect(hint).toContainText('Type, or tap anywhere')
      // Tapped on the caret spot: the caret is in, the hint stays.
      await tap(page, how, line.x + 6, line.y + 8)
      await page.waitForTimeout(700)
      expect(await caretIn(page)).toBe(true)
      await expect(hint).toContainText('Type, or tap anywhere')
      // A tap in the empty part while the caret is in: the hint stays too.
      await tap(page, how, b.x + b.width - 16, line.y + line.height / 2)
      await page.waitForTimeout(700)
      await expect(hint).toContainText('Type, or tap anywhere')
      // Typing starts: it goes.
      await page.keyboard.type('Go')
      await page.waitForTimeout(700)
      await expect(hint).toHaveCount(0)
    })

    test(`F2 ${name}: the first box's bar never covers the page tabs or words`, async ({
      page,
    }) => {
      await open(page, mode)
      await withWords(page)
      const main = page.locator(MAIN)
      const b = await rect(main)
      const t = await rect(main.locator('.bn-inline-content').first())
      await tap(page, how, b.x + b.width - 16, t.y + t.height / 2)
      await page.waitForTimeout(700)
      await expect(page.locator('[data-box-bar]').first()).toBeVisible()
      const bar = await rect(page.locator('[data-box-bar] > *').first())
      const taken = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '[data-page-tabs], [data-paper-box="main"] .bn-inline-content',
          ),
        ].map((n) => {
          const r = n.getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height }
        }),
      )
      expect(taken.length).toBeGreaterThan(1)
      for (const o of taken) {
        const hit =
          bar.x < o.x + o.width &&
          o.x < bar.x + bar.width &&
          bar.y < o.y + o.height &&
          o.y < bar.y + bar.height
        expect(hit, JSON.stringify({ bar, o })).toBe(false)
      }
    })

    test(`F3 ${name}: a tap in the empty part selects the box, no caret; a double tap selects no word`, async ({
      page,
    }) => {
      await open(page, mode)
      await withWords(page)
      const main = page.locator(MAIN)
      const b = await rect(main)
      const t = await rect(main.locator('.bn-inline-content').first())
      const x = b.x + b.width - 16
      const y = t.y + t.height / 2
      // What the page saw of the press: was it kept from the browser?
      await watchCancels(page)
      await tap(page, how, x, y)
      await page.waitForTimeout(700)
      await expect(main).toHaveAttribute('data-main-picked', '')
      expect(await caretIn(page)).toBe(false)
      expect(await selectedText(page)).toBe('')
      // No native caret or callout: the press was cancelled before the browser.
      const prevented = await cancelled(page)
      expect(prevented).toContain('pointerdown')
      if (how === 'finger') expect(prevented).toContain('touchend')
      await doubleTap(page, how, x, y)
      await page.waitForTimeout(700)
      await expect(main).toHaveAttribute('data-main-picked', '')
      expect(await caretIn(page)).toBe(false)
      expect(await selectedText(page)).toBe('')
      // A tap on the words still gives the caret.
      await tap(page, how, t.x + 20, t.y + t.height / 2)
      await page.waitForTimeout(700)
      expect(await caretIn(page)).toBe(true)
    })

    test(`F3 ${name}: the empty first box selects on an empty-part tap`, async ({
      page,
    }) => {
      await open(page, mode)
      const b = await rect(page.locator(MAIN))
      const line = await rect(page.locator(`${MAIN} .bn-block-content`).first())
      await tap(page, how, b.x + b.width - 16, line.y + line.height / 2)
      await page.waitForTimeout(700)
      await expect(page.locator(MAIN)).toHaveAttribute('data-main-picked', '')
      expect(await caretIn(page)).toBe(false)
    })

    test(`rule 2 ${name}: with words and the caret in the box, a tap in the empty part selects the box (no callout)`, async ({
      page,
    }) => {
      await open(page, mode)
      await withWords(page)
      const main = page.locator(MAIN)
      const b = await rect(main)
      const t = await rect(main.locator('.bn-inline-content').first())
      // The caret goes in at the first line (a tap on the words).
      await tap(page, how, t.x + 20, t.y + t.height / 2)
      await page.waitForTimeout(700)
      expect(await caretIn(page)).toBe(true)
      await watchCancels(page)
      await tap(page, how, b.x + b.width - 16, t.y + t.height / 2)
      await page.waitForTimeout(700)
      const c = await cancelled(page)
      expect(c).toContain('pointerdown')
      if (how === 'finger') expect(c).toContain('touchend')
      await expect(main).toHaveAttribute('data-main-picked', '')
      expect(await caretIn(page)).toBe(false)
      expect(await selectedText(page)).toBe('')
    })

    test(`rule 1 ${name}: an empty box: tap 1 selects, tap 2 puts the caret at the start, later taps keep it`, async ({
      page,
    }) => {
      await open(page, mode)
      const main = page.locator(MAIN)
      const b = await rect(main)
      const line = await rect(main.locator('.bn-block-content').first())
      const x = b.x + b.width - 16
      const y = line.y + line.height / 2
      await tap(page, how, x, y)
      await page.waitForTimeout(700)
      await expect(main).toHaveAttribute('data-main-picked', '')
      expect(await caretIn(page)).toBe(false)
      await tap(page, how, x, y)
      await page.waitForTimeout(700)
      expect(await caretIn(page)).toBe(true)
      await expect(main).not.toHaveAttribute('data-main-picked', '')
      await watchCancels(page)
      await tap(page, how, x, y)
      await page.waitForTimeout(700)
      expect(await caretIn(page)).toBe(true)
      expect((await cancelled(page)).includes('pointerdown')).toBe(true)
      // Still at the start of the line: typing lands there.
      await page.keyboard.type('Go')
      await expect(main).toContainText('Go')
    })

    test(`rule 3 ${name}: words running to the edge: near the words the caret, on the border the box`, async ({
      page,
    }) => {
      await open(page, mode)
      const main = page.locator(MAIN)
      const first = await rect(main.locator('.bn-block-content').first())
      await realPen(page, [{ x: first.x + 6, y: first.y + 8 }])
      await page.keyboard.type('mmmm '.repeat(60))
      await page.waitForTimeout(700)
      await page.evaluate(() => (document.activeElement as HTMLElement).blur())
      await page.keyboard.press('Escape')
      await page.waitForTimeout(900)
      const b = await rect(main)
      const lines = await page.evaluate((sel) => {
        const el = document.querySelector(sel + ' .bn-inline-content')!
        const r = document.createRange()
        r.selectNodeContents(el)
        return [...r.getClientRects()].map((q) => ({
          right: q.right,
          y: q.top + q.height / 2,
        }))
      }, MAIN)
      const widest = lines.reduce((m, q) => (q.right > m.right ? q : m))
      // On the last letters of the widest line: the caret.
      await tap(page, how, widest.right - 8, widest.y)
      await page.waitForTimeout(700)
      expect(await caretIn(page)).toBe(true)
      await page.evaluate(() => (document.activeElement as HTMLElement).blur())
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      // On the border: the box.
      await tap(page, how, b.x + b.width - 2, widest.y)
      await page.waitForTimeout(700)
      await expect(main).toHaveAttribute('data-main-picked', '')
      expect(await caretIn(page)).toBe(false)
    })

    test(`F4 ${name}: a tap anywhere inside the first box selects it, no new box`, async ({
      page,
    }) => {
      await open(page, mode)
      await withWords(page)
      const main = page.locator(MAIN)
      const frameEl = page.locator('[data-main-frame]')
      // Select it once to see its whole frame, then deselect.
      const b0 = await rect(main)
      const t0 = await rect(main.locator('.bn-inline-content').first())
      await tap(page, how, b0.x + b0.width - 16, t0.y + t0.height / 2)
      await page.waitForTimeout(500)
      const f = (await frameEl.count()) ? await rect(frameEl.first()) : b0
      await page.keyboard.press('Escape')
      await page.mouse.click(5, 5)
      await page.waitForTimeout(500)
      const blocks = () => page.locator(`${MAIN} .bn-block-content`).count()
      const extras = () =>
        page.locator('[data-paper-box]:not([data-paper-box="main"])').count()
      const before = [await blocks(), await extras()]
      // Bottom-right corner, just inside the frame.
      for (const [dx, dy] of [
        [6, 6],
        [3, 3],
      ]) {
        await tap(page, how, f.x + f.width - dx, f.y + f.height - dy)
        await page.waitForTimeout(700)
        await expect(main).toHaveAttribute('data-main-picked', '')
        expect([await blocks(), await extras()]).toEqual(before)
        await page.keyboard.press('Escape')
        await page.mouse.click(5, 5)
        await page.waitForTimeout(400)
      }
    })
  }

/** First-look pictures: screenshots/first-box-tap/. */
for (const [label, theme] of [
  ['light', 'day'],
  ['dark', 'night'],
] as const)
  test(`pictures: iPad sideways, ${label}`, async ({ page }, info) => {
    await open(page, 'pencil')
    await page.evaluate(
      (th) => document.documentElement.setAttribute('data-theme', th),
      theme,
    )
    mkdirSync('screenshots/first-box-tap', { recursive: true })
    const out = (n: string) =>
      `screenshots/first-box-tap/${info.project.name}-${n}-${label}.png`
    await page.screenshot({ path: out('f1-empty-hint') })
    const b = await rect(page.locator(MAIN))
    const line = await rect(page.locator(`${MAIN} .bn-block-content`).first())
    await realPen(page, [
      { x: b.x + b.width - 16, y: line.y + line.height / 2 },
    ])
    await page.waitForTimeout(700)
    await page.screenshot({ path: out('f1-f2-f3-selected-empty') })
    await page.keyboard.press('Escape')
    await withWords(page)
    const b2 = await rect(page.locator(MAIN))
    const t = await rect(page.locator(`${MAIN} .bn-inline-content`).first())
    await realPen(page, [{ x: b2.x + b2.width - 16, y: t.y + t.height / 2 }])
    await page.waitForTimeout(700)
    await page.screenshot({ path: out('f2-f3-selected-words') })
    const f = await rect(page.locator('[data-main-frame]').first())
    await page.keyboard.press('Escape')
    await page.mouse.click(5, 5)
    await realPen(page, [{ x: f.x + f.width - 5, y: f.y + f.height - 5 }])
    await page.waitForTimeout(700)
    await page.screenshot({ path: out('f4-corner') })
  })
