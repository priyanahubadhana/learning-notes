// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Pencil tap counts in typing mode, with real iPad timing (owner, 7 Nov):
 * R6-18 a double tap selects the word and the selection STAYS (the browser's
 * own late reaction to the tap is held off and, if it still lands, put
 * back); R6-19 a triple tap selects the visual line on screen, not the whole
 * paragraph; four taps select the paragraph. Pen pointer events are
 * simulated; the browser's synthetic click that iPadOS sends after a tap is
 * simulated too when the tap was not cancelled.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

type Pt = { x: number; y: number }

const LONG =
  'Learning works best when the notes are short, the summary is shorter and the recall cards ask one thing at a time, so that each review session stays quick and the memory of the page grows stronger every single day of the week.'

async function setup(page: Page) {
  await openNote(page, 'touch')
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Enter')
  await page.keyboard.type(LONG)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
}

/** The middle of a word (the first time it appears in the page). */
async function wordPoint(page: Page, word: string): Promise<Pt> {
  return page.evaluate((w) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const at = (n.textContent ?? '').indexOf(w)
      if (at < 0) continue
      const r = document.createRange()
      r.setStart(n, at)
      r.setEnd(n, at + w.length)
      const b = r.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    throw new Error('word not found: ' + w)
  }, word)
}

/**
 * One Pencil tap: pointer events, then (as iPadOS does after a tap that was
 * not cancelled) the synthetic mouse events a moment later. Returns whether
 * the pointerdown was cancelled.
 */
async function penTap(page: Page, at: Pt, drift = 0): Promise<boolean> {
  return page.evaluate(
    ({ at, drift }) => {
      const make = (name: string, x: number, y: number) =>
        new PointerEvent(name, {
          pointerType: 'pen',
          pointerId: 31,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      const el = document.elementFromPoint(at.x, at.y)!
      const kept = el.dispatchEvent(make('pointerdown', at.x, at.y))
      el.dispatchEvent(make('pointerup', at.x + drift, at.y))
      if (kept) {
        setTimeout(() => {
          for (const name of ['mousedown', 'mouseup', 'click']) {
            el.dispatchEvent(
              new MouseEvent(name, {
                clientX: at.x,
                clientY: at.y,
                bubbles: true,
                cancelable: true,
                button: 0,
              }),
            )
          }
        }, 0)
      }
      return !kept
    },
    { at, drift },
  )
}

/** Taps at the same spot, `gap` ms apart; the cancel flags of each tap. */
async function taps(page: Page, at: Pt, n: number, gap = 160) {
  const flags: boolean[] = []
  for (let i = 0; i < n; i++) {
    if (i > 0) await page.waitForTimeout(gap)
    flags.push(await penTap(page, at, i % 2 ? 4 : 0))
  }
  return flags
}

const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

/** The screen rows the marked text sits on (distinct tops). */
const markedRows = (page: Page) =>
  page.evaluate(() => {
    const tops = new Set<number>()
    for (const el of document.querySelectorAll('.bn-editor .ln-sel')) {
      for (const r of el.getClientRects()) {
        if (r.width > 0) tops.add(Math.round(r.top / 4))
      }
    }
    return tops.size
  })

test('R6-18: a Pencil double tap selects the word and the selection stays, mini toolbar shown', async ({
  page,
}) => {
  await setup(page)
  const at = await wordPoint(page, 'summary')
  const flags = await taps(page, at, 2)
  // The second tap is ours: the browser's own tap is held off.
  expect(flags[1]).toBe(true)
  await expect.poll(() => marked(page)).toBe('summary')
  // The browser's late reaction to that same tap: a collapse that arrives
  // with no new pointerdown. It is put back.
  await page.waitForTimeout(100)
  await page.evaluate(() => {
    const s = window.getSelection()
    if (s && s.anchorNode) s.collapse(s.anchorNode, s.anchorOffset)
  })
  await page.waitForTimeout(1000)
  expect(await marked(page)).toBe('summary')
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
  await expect(page.locator('[data-sel-handle]')).toHaveCount(2)
})

test('R6-18: real iPad timing, 440 ms apart and 8 px of drift, still counts as a double tap', async ({
  page,
}) => {
  await setup(page)
  const at = await wordPoint(page, 'summary')
  await penTap(page, at)
  await page.waitForTimeout(420)
  await penTap(page, { x: at.x + 6, y: at.y + 5 }, 3)
  await expect.poll(() => marked(page)).toBe('summary')
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
})

test('R6-19: a triple tap selects the visual line on screen, not the whole paragraph', async ({
  page,
}) => {
  await setup(page)
  // A word well into the wrapped paragraph (on its second or third row).
  const at = await wordPoint(page, 'review')
  await taps(page, at, 3)
  await expect.poll(() => markedRows(page)).toBe(1)
  const text = await marked(page)
  expect(text).toContain('review')
  expect(text.length).toBeGreaterThan(20)
  expect(text.length).toBeLessThan(LONG.length - 20)
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
  // It stays, like the word.
  await page.waitForTimeout(1000)
  expect(await marked(page)).toBe(text)
})

test('four taps select the whole paragraph', async ({ page }) => {
  await setup(page)
  const at = await wordPoint(page, 'review')
  await taps(page, at, 4)
  await expect.poll(() => marked(page)).toBe(LONG)
  await expect.poll(() => markedRows(page)).toBeGreaterThan(1)
})

test('a slow second tap (over 450 ms) is a plain tap: no word is selected', async ({
  page,
}) => {
  await setup(page)
  const at = await wordPoint(page, 'summary')
  await penTap(page, at)
  await page.waitForTimeout(600)
  expect(await penTap(page, at)).toBe(false)
  await page.waitForTimeout(300)
  expect(await marked(page)).toBe('')
})
