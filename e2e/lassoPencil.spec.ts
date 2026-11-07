// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  savedInk,
  stroke,
  textBox,
  type Pt,
} from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Lasso and Pencil taps after the owner's iPad findings (7 Nov): nothing
 * under the ink reacts while a lasso is drawn, a lasso works over an empty
 * block, the handles turn and resize instead of selecting text, a quick tap
 * is not ink, and a double or triple tap selects the word or the line with
 * the Pencil and with a finger. Simulated pointer events, as the other ink
 * specs; runs in Chromium and in the iPad stand-in (ipad-webkit).
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

/** The words the page marks as selected (our own selection decorations). */
const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

/** Is the browser's own selection non-empty inside the page? */
const browserSelected = (page: Page) =>
  page.evaluate(() => {
    const s = window.getSelection()
    return !!s && !s.isCollapsed && s.toString().length > 0
  })

/** A quick tap (down and up at once), with a pen or a finger. */
async function tap(page: Page, at: Pt, type: 'pen' | 'touch' = 'pen', id = 31) {
  await page.evaluate(
    ({ at, type, id }) => {
      const make = (name: string) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: id,
          clientX: at[0],
          clientY: at[1],
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
          pressure: name === 'pointerup' ? 0 : 0.4,
        })
      const el = document.elementFromPoint(at[0], at[1])!
      el.dispatchEvent(make('pointerdown'))
      el.dispatchEvent(make('pointerup'))
    },
    { at, type, id },
  )
}

async function taps(page: Page, at: Pt, n: number, type: 'pen' | 'touch') {
  for (let i = 0; i < n; i++) {
    await tap(page, at, type)
    await page.waitForTimeout(70)
  }
}

/** Where a word of the first line is on screen. */
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
      return [b.x + b.width / 2, b.y + b.height / 2] as [number, number]
    }
    throw new Error('word not found')
  }, word)
}

/**
 * A loop of small steps around a box; it starts on the paper under the box
 * and stays inside the page column (the ink pad is exactly as wide as it).
 */
const loopAround = (b: { x: number; y: number; w: number; h: number }) => {
  const c: Pt[] = [
    [b.x - 4, b.y + b.h + 12],
    [b.x - 4, b.y - 4],
    [b.x + b.w + 8, b.y - 4],
    [b.x + b.w + 8, b.y + b.h + 12],
    [b.x - 2, b.y + b.h + 10],
  ]
  return c.slice(1).flatMap((p, i) => line(c[i], p, 10))
}

/** Ink over the first line of words, then the Lasso. */
async function inkOverWords(page: Page) {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(600)
  const box = await textBox(page)
  const y = box.y + box.height / 2
  await stroke(page, line([box.x + 10, y], [box.x + 180, y]))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape') // the pill would cover the page
  await page.waitForTimeout(500) // the closed pill gives the page its room back
  const now = await textBox(page)
  return { x: now.x + 10, y: y + (now.y - box.y) - 10, w: 170, h: 20 }
}

test('a lasso over ink on words never selects or marks the text, during the drag or after', async ({
  page,
}) => {
  const ink = await inkOverWords(page)
  // The Lasso owns the page while there is ink: the pad is on.
  await expect
    .poll(() =>
      page.evaluate(
        ({ x, y }) =>
          document.elementFromPoint(x, y)?.hasAttribute('data-ink-pad'),
        { x: ink.x + 40, y: ink.y + 10 },
      ),
    )
    .toBe(true)
  const path = loopAround(ink)
  await stroke(page, path, { keepDown: true, id: 41 })
  // Mid-gesture: no text selection, no marked block.
  expect(await marked(page)).toBe('')
  expect(await browserSelected(page)).toBe(false)
  expect(
    await page.evaluate(
      () => document.querySelectorAll('[data-active-block]').length,
    ),
  ).toBe(0)
  await stroke(page, [path[path.length - 1]], { id: 41 }) // lift
  await expect(page.locator('[data-ink-box]')).toBeVisible()
  expect(await marked(page)).toBe('')
  expect(await browserSelected(page)).toBe(false)
  // The page is editable again once the gesture ended.
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.querySelector('.bn-editor')?.getAttribute('contenteditable'),
      ),
    )
    .toBe('true')
})

test('a lasso works over an empty block and over blank paper', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  // A second, empty block under the words (typed under the Text tool).
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  await tool(page, 'Pen').click()
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const empty = await page.locator('.bn-block-content').nth(1).boundingBox()
  if (!empty) throw new Error('no empty block')
  const y = empty.y + empty.height / 2
  await stroke(page, line([empty.x + 10, y], [empty.x + 160, y]))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const now = await page.locator('.bn-block-content').nth(1).boundingBox()
  const dy = (now?.y ?? empty.y) - empty.y
  await stroke(
    page,
    loopAround({ x: empty.x + 10, y: y + dy - 8, w: 150, h: 16 }),
  )
  await expect(page.locator('[data-ink-box]')).toBeVisible()
  expect(await marked(page)).toBe('')
  // A tap on blank paper lets go of the selection (as in GoodNotes).
  await tap(page, [empty.x + 300, y + dy + 120])
  await expect(page.locator('[data-ink-box]')).toHaveCount(0)
})

test('Pencil drags on the turn and resize handles act and never select the text', async ({
  page,
}) => {
  const ink = await inkOverWords(page)
  await stroke(page, loopAround(ink))
  const selBox = page.locator('[data-ink-box]')
  await expect(selBox).toBeVisible()
  const [orig] = (await savedInk(page)).strokes
  // A tap on the turn handle: nothing selected, nothing changed.
  const rot = page.locator('[data-handle="rotate"]')
  const r = (await rot.boundingBox())!
  const rc: Pt = [r.x + r.width / 2, r.y + r.height / 2]
  await tap(page, rc)
  await page.waitForTimeout(300)
  expect(await marked(page)).toBe('')
  expect((await savedInk(page)).strokes[0].id).toBe(orig.id)
  await expect(selBox).toBeVisible()
  // A Pencil drag on the turn handle turns the drawing a quarter turn.
  const b = (await selBox.boundingBox())!
  await stroke(page, line(rc, [b.x + b.width + 160, b.y + b.height / 2], 12))
  await expect
    .poll(async () => (await savedInk(page)).strokes[0].id)
    .not.toBe(orig.id)
  const turned = (await savedInk(page)).strokes[0]
  const xs = (p: number[]) => p.filter((_, i) => i % 6 === 0)
  const ys = (p: number[]) => p.filter((_, i) => i % 6 === 1)
  const span = (v: number[]) => Math.max(...v) - Math.min(...v)
  expect(span(ys(turned.pts))).toBeGreaterThan(span(xs(turned.pts)))
  expect(await marked(page)).toBe('')
  expect(await browserSelected(page)).toBe(false)
  // A Pencil drag on a corner handle makes it bigger.
  const b2 = (await selBox.boundingBox())!
  const corner = page.locator('[data-handle="scale"]').nth(3)
  const c = (await corner.boundingBox())!
  await stroke(
    page,
    line(
      [c.x + c.width / 2, c.y + c.height / 2],
      [b2.x + b2.width + 90, b2.y + b2.height + 90],
      12,
    ),
  )
  await expect
    .poll(async () => (await savedInk(page)).strokes[0].id)
    .not.toBe(turned.id)
  const scaled = (await savedInk(page)).strokes[0]
  expect(span(ys(scaled.pts))).toBeGreaterThan(span(ys(turned.pts)) * 1.2)
  expect(await marked(page)).toBe('')
})

test('a quick Pen tap and a double tap leave no ink; a held press makes a dot', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(600)
  const box = await textBox(page)
  const blank: Pt = [box.x + 200, box.y + box.height + 160]
  await tap(page, blank)
  await page.waitForTimeout(400)
  expect((await savedInk(page)).strokes).toHaveLength(0)
  await taps(page, [blank[0] + 60, blank[1]], 2, 'pen')
  await page.waitForTimeout(400)
  expect((await savedInk(page)).strokes).toHaveLength(0)
  // A deliberate dot: the pen stays down a moment.
  await stroke(page, [[blank[0] + 120, blank[1]]], { holdMs: 160 })
  const [dot] = await expectStrokes(page, 1)
  expect(dot.pts.length).toBeGreaterThanOrEqual(6)
  // A tiny mark (under 3 px, 150 ms) followed by a second pen-down within
  // 300 ms and 10 px is a double tap: the mark is taken back.
  const flick = line(
    [blank[0] + 200, blank[1]],
    [blank[0] + 202, blank[1] + 1],
    3,
  )
  await stroke(page, flick, { holdMs: 100 })
  await page.waitForTimeout(40)
  await tap(page, [blank[0] + 204, blank[1] + 2])
  await page.waitForTimeout(500)
  expect((await savedInk(page)).strokes).toHaveLength(1)
})

for (const type of ['pen', 'touch'] as const) {
  test(`${type}: under the Lasso with ink, a double tap selects the word and a triple tap the line`, async ({
    page,
  }) => {
    await inkOverWords(page)
    const at = await wordPoint(page, 'nucleus')
    await taps(page, at, 2, type)
    await expect.poll(() => marked(page)).toBe('nucleus')
    await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
    await page.waitForTimeout(500)
    await taps(page, at, 3, type)
    await expect.poll(() => marked(page)).toBe('The nucleus holds the DNA')
    // Still no ink selection and no stray stroke.
    expect((await savedInk(page)).strokes).toHaveLength(1)
  })
}

test('pen: under the Pen tool a double tap on a word selects it instead of drawing', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(600)
  const at = await wordPoint(page, 'holds')
  await taps(page, at, 2, 'pen')
  await expect.poll(() => marked(page)).toBe('holds')
  await page.waitForTimeout(400)
  expect((await savedInk(page)).strokes).toHaveLength(0)
})
