// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import {
  expectStrokes,
  inkNote,
  savedInk,
  stroke,
  textBox,
  wave,
  type Pt as Tp,
} from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { installRealPen, realPen, type Pt } from './realPen.ts'
import { machineState } from './toolsHelpers.ts'

/**
 * Part A0 of the Lasso work (docs/plans/phases/phase-2-finish.md, lane A): the
 * Lasso as it is today, held still by tests. Scenarios S1 to S5 and the lines
 * LS-01 to LS-47 of docs/features/lasso.md that a computer can check. Every
 * loop is drawn with a real-browser Pencil (e2e/realPen.ts: trusted pointer
 * events relabelled as a pen). Drawings are made with the Pen first (the
 * simulated pen of the other ink specs). Time (the 4 s rule) runs on the test
 * tool's own clock. No app file is touched by this part.
 *
 * Lines only the owner's iPad can prove (Scribble, Apple's bar, a lift the
 * iPad never reports) are marked `@ipad` in the page; here a computer stands
 * in (S2) or they are left to the owner's check.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const BOX = '[data-ink-box]'
const MENU = '[data-ink-menu]'

type Rect = { x: number; y: number; w: number; h: number }

/** Saved points are fractions of the page width: x, y, pressure, tilt, tilt, time. */
const xs = (p: number[]) => p.filter((_, i) => i % 6 === 0)
const ys = (p: number[]) => p.filter((_, i) => i % 6 === 1)
const mid = (v: number[]) => (Math.min(...v) + Math.max(...v)) / 2

/** The saved drawings, left to right: where each one is (page px). */
async function drawings(page: Page) {
  const { strokes } = await savedInk(page)
  const pad = (await page.locator('[data-ink-pad]').boundingBox())!.width
  return strokes
    .map((s) => ({
      id: s.id,
      cx: mid(xs(s.pts)) * pad,
      cy: mid(ys(s.pts)) * pad,
      w: (Math.max(...xs(s.pts)) - Math.min(...xs(s.pts))) * pad,
      width: s.style.width,
    }))
    .sort((a, b) => a.cx - b.cx)
}

/** A loop of small steps round a rectangle (a hand does not jump). */
function loopRound(b: Rect, pad = 18): Pt[] {
  const c: Pt[] = [
    { x: b.x - pad, y: b.y + b.h + pad },
    { x: b.x - pad, y: b.y - pad },
    { x: b.x + b.w + pad, y: b.y - pad },
    { x: b.x + b.w + pad, y: b.y + b.h + pad },
    { x: b.x - pad + 3, y: b.y + b.h + pad - 3 },
  ]
  return c.slice(1).flatMap((p, i) =>
    Array.from({ length: 8 }, (_, k) => ({
      x: c[i].x + ((p.x - c[i].x) * (k + 1)) / 8,
      y: c[i].y + ((p.y - c[i].y) * (k + 1)) / 8,
    })),
  )
}

interface Scene {
  /** The two drawings on screen now (client px), left and right. */
  a: Rect
  b: Rect
  /** A blank spot (client px) well away from both. */
  empty: Pt
}

/**
 * A page with two small drawings, the Lasso picked (Picks: Ink only, the
 * default). The page may move when the Lasso's pill closes: the drawings are
 * measured after that.
 */
async function drawingsPage(
  page: Page,
  keys: Record<string, unknown> = {},
): Promise<Scene> {
  await installRealPen(page)
  await inkNote(page, 'Pen', 'pencil', keys)
  const box = await textBox(page)
  const y = box.y + 80
  await stroke(page, wave(box.x + 40, box.x + 180, y, 14, 30))
  await stroke(page, wave(box.x + 300, box.x + 440, y, 14, 30), { id: 8 })
  await expectStrokes(page, 2)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape') // the pill would cover the page
  await page.waitForTimeout(500)
  const now = await textBox(page)
  const dy = now.y - box.y
  return {
    a: { x: box.x + 40, y: y + dy - 14, w: 140, h: 28 },
    b: { x: box.x + 300, y: y + dy - 14, w: 140, h: 28 },
    empty: { x: box.x + 250, y: y + dy + 300 },
  }
}

/** The selection box on screen. */
const selBox = async (page: Page) =>
  (await page.locator(BOX).boundingBox()) as {
    x: number
    y: number
    width: number
    height: number
  }

/** Is the selection box round this drawing (and not round the other)? */
async function selectionIsAround(page: Page, r: Rect) {
  await expect(page.locator(BOX)).toBeVisible()
  const s = await selBox(page)
  expect(s.x + s.width / 2).toBeGreaterThan(r.x)
  expect(s.x + s.width / 2).toBeLessThan(r.x + r.w)
  expect(s.width).toBeLessThan(r.w + 80)
}

/** Opens ⋯ More when it is not open yet. */
async function showMore(page: Page) {
  if (!(await page.locator('[data-ink-more]').isVisible()))
    await page.locator('[data-ink-action="more"]').click()
  await expect(page.locator('[data-ink-more]')).toBeVisible()
}

const centre = (b: {
  x: number
  y: number
  width: number
  height: number
}) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
})

test.describe('the Lasso on drawings', () => {
  test('S1 A loop round a drawing selects it [LS-12, LS-22, LS-32]', async ({
    page,
  }) => {
    const s =
      await test.step('Given a page with a small drawing and the Lasso tool picked', () =>
        drawingsPage(page))
    await test.step('When I draw a loop round the whole drawing with the Pencil', () =>
      realPen(page, loopRound(s.a)))
    await test.step('Then the drawing is selected, with its dashed box and handles (LS-22)', async () => {
      await selectionIsAround(page, s.a)
      // Four corners; a flat drawing of 160 px has side handles on its long sides only.
      expect(
        await page.locator('[data-handle="scale"]').count(),
      ).toBeGreaterThanOrEqual(4)
      expect(
        await page.locator('[data-handle="scale"][data-axis="both"]').count(),
      ).toBe(4)
      await expect(page.locator('[data-handle="rotate"]')).toHaveCount(1)
    })
    await test.step('And the Lasso bar shows its default row (LS-32)', async () => {
      const menu = page.locator(MENU)
      await expect(menu).toBeVisible()
      for (const id of ['copy', 'cut', 'duplicate', 'convert', 'colour'])
        await expect(menu.locator(`[data-ink-action="${id}"]`)).toBeVisible()
      // The rest is under More.
      await expect(menu.locator('[data-ink-action="delete"]')).toHaveCount(0)
      await expect(menu.locator('[data-ink-action="deselect"]')).toBeVisible()
      await expect(menu.locator('[data-ink-action="more"]')).toBeVisible()
    })
  })

  test('LS-12 a stroke is taken when most of it is inside the loop (60 %)', async ({
    page,
  }) => {
    const s = await drawingsPage(page)
    await test.step('a loop that holds under half of the stroke takes nothing', async () => {
      const part = { ...s.a, w: s.a.w * 0.4 }
      await realPen(page, loopRound(part, 6))
      await expect(page.locator(BOX)).toHaveCount(0)
    })
    await test.step('a loop that holds about three quarters takes it', async () => {
      const part = { ...s.a, w: s.a.w * 0.78, x: s.a.x - 20 }
      await realPen(page, loopRound(part, 6))
      await expect(page.locator(BOX)).toBeVisible()
    })
  })

  test('S4 A new loop lets go of the old selection [LS-07, LS-N2]', async ({
    page,
  }) => {
    const s =
      await test.step('Given a drawing is selected with the Lasso', async () => {
        const s = await drawingsPage(page)
        await realPen(page, loopRound(s.a))
        await selectionIsAround(page, s.a)
        return s
      })
    const before = await drawings(page)
    await test.step('When I draw a new loop round another drawing', () =>
      realPen(page, loopRound(s.b)))
    await test.step('Then only the other drawing is selected', async () => {
      await expect
        .poll(
          async () =>
            centre((await selBox(page)) ?? { x: 0, y: 0, width: 0, height: 0 })
              .x,
        )
        .toBeGreaterThan(s.b.x)
      await selectionIsAround(page, s.b)
      await expect(page.locator(BOX)).toHaveCount(1)
    })
    await test.step('And the first drawing has not moved or changed', async () => {
      const after = await drawings(page)
      expect(after).toEqual(before)
    })
  })

  test('S5 Moving a selection is one Undo [LS-26, LS-41]', async ({ page }) => {
    await test.step('Given a drawing is selected with the Lasso', async () => {
      const s = await drawingsPage(page)
      await realPen(page, loopRound(s.a))
      await selectionIsAround(page, s.a)
      return s
    })
    const before = await drawings(page)
    await test.step('When I drag it to a new place (LS-26)', async () => {
      // A point inside the box, clear of the side handle that sits in its middle.
      const sb = await selBox(page)
      const c = { x: sb.x + sb.width * 0.3, y: sb.y + sb.height / 2 }
      await realPen(page, [
        { x: c.x, y: c.y },
        { x: c.x + 30, y: c.y + 20 },
        { x: c.x + 80, y: c.y + 50 },
        { x: c.x + 120, y: c.y + 80 },
      ])
      await expect
        .poll(async () => (await drawings(page))[0].cx - before[0].cx)
        .toBeGreaterThan(80)
      const moved = (await drawings(page))[0]
      expect(moved.cy - before[0].cy).toBeGreaterThan(50)
    })
    await test.step('And I undo once (LS-41)', async () => {
      await tool(page, 'Undo').click()
    })
    await test.step('Then the drawing is back where it was', async () => {
      await expect
        .poll(async () => {
          const a = (await drawings(page))[0]
          return Math.abs(a.cx - before[0].cx) + Math.abs(a.cy - before[0].cy)
        })
        .toBeLessThan(1)
      expect(await drawings(page)).toHaveLength(2)
    })
  })

  test('LS-27 a corner drag resizes and keeps the shape, never past 10 times', async ({
    page,
  }) => {
    const s = await drawingsPage(page)
    await realPen(page, loopRound(s.a))
    await selectionIsAround(page, s.a)
    const sizeOf = async () => {
      const { strokes } = await savedInk(page)
      return strokes
        .map((x) => ({
          w: Math.max(...xs(x.pts)) - Math.min(...xs(x.pts)),
          h: Math.max(...ys(x.pts)) - Math.min(...ys(x.pts)),
          cx: mid(xs(x.pts)),
        }))
        .sort((p, q) => p.cx - q.cx)[0]
    }
    const first = await sizeOf()
    const dragCorner = async (dx: number, dy: number) => {
      const corner = page
        .locator('[data-handle="scale"][data-axis="both"]')
        .nth(3)
      // The lower right of the handle: on a flat drawing the middle-edge
      // handle covers the corner's centre (as in inkTools.spec).
      const hb = (await corner.boundingBox())!
      const c = { x: hb.x + 32, y: hb.y + 34 }
      await realPen(page, [
        { x: c.x, y: c.y },
        { x: c.x + 12, y: c.y + 8 },
        { x: c.x + dx, y: c.y + dy },
      ])
    }
    await test.step('a corner drag makes it bigger, in the same shape', async () => {
      await dragCorner(120, 60)
      await expect
        .poll(async () => {
          const now = await sizeOf()
          return now.w > first.w * 1.3 ? now.w / now.h / (first.w / first.h) : 0
        })
        .toBeCloseTo(1, 1)
    })
    await test.step('a drag far past the limit stops at 10 times', async () => {
      await dragCorner(900, 500)
      await page.waitForTimeout(400)
      expect((await sizeOf()).w).toBeLessThanOrEqual(first.w * 10.01)
    })
  })

  test('LS-02 a finger scrolls and never draws a loop; a mouse or Pencil does', async ({
    page,
  }) => {
    const s = await drawingsPage(page)
    const path = loopRound(s.a).map((p) => [p.x, p.y]) as Tp[]
    await stroke(page, path, { type: 'touch', id: 21 })
    await page.waitForTimeout(300)
    await expect(page.locator(BOX)).toHaveCount(0)
    await realPen(page, loopRound(s.a))
    await expect(page.locator(BOX)).toBeVisible()
  })

  test('LS-30 a tap on the box or on a handle without moving adds no Undo step', async ({
    page,
  }) => {
    const s = await drawingsPage(page)
    await realPen(page, loopRound(s.a))
    await selectionIsAround(page, s.a)
    const before = await drawings(page)
    const c = centre(await selBox(page))
    await realPen(page, [{ x: c.x, y: c.y }])
    const rot = centre(
      (await page.locator('[data-handle="rotate"]').boundingBox())!,
    )
    await realPen(page, [{ x: rot.x, y: rot.y }])
    await page.waitForTimeout(300)
    expect(await drawings(page)).toEqual(before)
    // One Undo goes straight to the last real change (drawing the 2nd stroke).
    await tool(page, 'Undo').click()
    await expect.poll(async () => (await drawings(page)).length).toBe(1)
    expect((await drawings(page))[0].id).toBe(before[0].id)
  })

  test('LS-33 ⋯ More holds Delete, Thickness, Make card, Add to Summary, Name this drawing, Copy and Save as picture', async ({
    page,
  }) => {
    const s = await drawingsPage(page)
    await realPen(page, loopRound(s.a))
    await selectionIsAround(page, s.a)
    await page.locator('[data-ink-action="more"]').click()
    const more = page.locator('[data-ink-more]')
    await expect(more).toBeVisible()
    for (const id of [
      'delete',
      'thickness',
      'makeCard',
      'summary',
      'label',
      'copyPng',
      'savePng',
    ])
      await expect(more.locator(`[data-ink-action="${id}"]`), id).toBeVisible()
    // Paste only shows when something was copied; Replay only when recorded.
    await expect(more.locator('[data-ink-action="paste"]')).toHaveCount(0)
    await expect(more.locator('[data-ink-action="replay"]')).toHaveCount(0)
    await test.step('Thickness changes the stroke width', async () => {
      const w0 = (await drawings(page))[0].width
      // The menu's own width grip lies over this button's edge: a click is sent to the button itself.
      await more.locator('[data-ink-action="thickness"]').dispatchEvent('click')
      await page.locator('[data-ink-thickness]').last().click()
      await expect
        .poll(async () => (await drawings(page))[0].width)
        .not.toBe(w0)
    })
    await test.step('Name this drawing opens a field that saves a name', async () => {
      await showMore(page)
      await page.locator('[data-ink-action="label"]').click()
      const input = page.locator('[data-ink-label-input]')
      await expect(input).toBeVisible()
      await input.fill('Cell')
      await input.press('Enter')
      await expect(input).toHaveCount(0)
    })
    await test.step('Copy puts Paste into More', async () => {
      await page.locator('[data-ink-action="copy"]').click()
      await showMore(page)
      await expect(page.locator('[data-ink-action="paste"]')).toBeVisible()
    })
  })

  test('LS-38 LS-39 a tap on empty paper lets go; Esc lets go; Delete and Backspace delete the selection', async ({
    page,
  }) => {
    const s = await drawingsPage(page)
    await test.step('a Pencil tap on empty paper lets go (LS-38)', async () => {
      await realPen(page, loopRound(s.a))
      await expect(page.locator(BOX)).toBeVisible()
      await realPen(page, [s.empty])
      await expect(page.locator(BOX)).toHaveCount(0)
    })
    await test.step('Esc lets go (LS-39)', async () => {
      await realPen(page, loopRound(s.a))
      await expect(page.locator(BOX)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator(BOX)).toHaveCount(0)
      expect(await drawings(page)).toHaveLength(2)
    })
    await test.step('Delete deletes the selection (LS-39)', async () => {
      await realPen(page, loopRound(s.a))
      await expect(page.locator(BOX)).toBeVisible()
      await page.keyboard.press('Delete')
      await expectStrokes(page, 1)
      await expect(page.locator(BOX)).toHaveCount(0)
    })
    await test.step('Backspace deletes the selection (LS-39)', async () => {
      await realPen(page, loopRound(s.b))
      await expect(page.locator(BOX)).toBeVisible()
      await page.keyboard.press('Backspace')
      await expectStrokes(page, 0)
    })
  })

  test('LS-40 picking another tool lets go of the selection', async ({
    page,
  }) => {
    const s = await drawingsPage(page)
    await realPen(page, loopRound(s.a))
    await expect(page.locator(BOX)).toBeVisible()
    await tool(page, 'Pen').click()
    await expect(page.locator(BOX)).toHaveCount(0)
    expect(await drawings(page)).toHaveLength(2)
  })

  test('LS-42 a touch held without moving for 4 seconds is dropped (fake clock)', async ({
    page,
  }) => {
    await page.clock.install()
    const s = await drawingsPage(page)
    // A loop whose Pencil stays down and still: the lift never comes.
    await page.evaluate(() => {
      ;(window as unknown as { __realPen?: boolean }).__realPen = true
    })
    const p = loopRound(s.a)
    await page.mouse.move(p[0].x - 3, p[0].y - 6)
    await page.mouse.move(p[0].x, p[0].y)
    await page.mouse.down()
    for (const q of p) await page.mouse.move(q.x, q.y)
    await expect.poll(() => machineState(page)).not.toBe('idle')
    await page.clock.runFor(2500)
    expect(await machineState(page)).not.toBe('idle')
    await page.clock.runFor(2500) // 5 s in all: past the 4 s limit
    await expect.poll(() => machineState(page)).toBe('idle')
    await page.mouse.up()
    await page.evaluate(() => {
      ;(window as unknown as { __realPen?: boolean }).__realPen = false
    })
    // The next touch works at once.
    await realPen(page, loopRound(s.b))
    await selectionIsAround(page, s.b)
  })
})

/* ---------- words in a text box (textbox.v2) ---------- */

const WORDS = 'Service 23-11 2000 rate-is'
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'

test.describe('the Lasso on words', () => {
  test.use({
    viewport: { width: 1336, height: 1100 },
    deviceScaleFactor: 2,
  })

  async function wordsPage(page: Page, picks: Record<string, boolean>) {
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
    )
    await installRealPen(page)
    await startInMode(page, 'computer')
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"'),
    )
    await page.goto('/')
    await createNotebook(page, 'Paper', 'Freeze')
    await typeInEditor(page, 'Main text')
    const sheet = (await page
      .locator('[data-paper-sheet="1"]')
      .first()
      .boundingBox())!
    const main = (await page
      .locator('[data-paper-box="main"]')
      .first()
      .boundingBox())!
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 90,
    )
    const box = page.locator(EXTRA)
    await expect(box).toHaveCount(1)
    await expect(box.locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('First filler line')
    await page.keyboard.press('Enter')
    await page.keyboard.insertText(WORDS)
    await expect(box.locator('.bn-editor')).toContainText(WORDS)
    await page.keyboard.press('Enter')
    await expect
      .poll(() =>
        box.locator('.bn-editor br:not(.ProseMirror-trailingBreak)').count(),
      )
      .toBe(2)
    await page.keyboard.type('Last filler line')
    await expect(box.locator('.bn-editor')).toContainText('Last filler line')
    await page.waitForTimeout(700)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.waitForTimeout(1000)
    await page.evaluate((p) => window.__lnTools!.setLasso(p), {
      shape: 'free',
      ink: true,
      pictures: false,
      ...picks,
    })
    await tool(page, 'Lasso').click()
    // The first Pencil press hides the key hints on the bar (the page moves once).
    const sh = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
    await realPen(page, [{ x: sh.x + sh.width - 30, y: sh.y + sh.height - 60 }])
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)
    return box
  }

  /** Screen box of the characters [from, to) of the WORDS line. */
  const wordsBox = (page: Page, from: number, to: number) =>
    page.evaluate(
      ({ from, to, sel, words }) => {
        const ed = document.querySelector(sel + ' .bn-editor')!
        const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
        const at: { n: Node; o: number }[] = []
        let all = ''
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          const t = n.textContent ?? ''
          for (let o = 0; o < t.length; o++) at.push({ n, o })
          all += t
        }
        const s = all.indexOf(words)
        const a = at[s + from]
        const z = at[s + to - 1]
        const r = document.createRange()
        r.setStart(a.n, a.o)
        r.setEnd(z.n, z.o + 1)
        const b = r.getBoundingClientRect()
        return { x: b.x, y: b.y, w: b.width, h: b.height }
      },
      { from, to, sel: EXTRA, words: WORDS },
    )

  const selected = (page: Page) =>
    page.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel + ' .bn-editor .ln-sel')]
          .map((e) => e.textContent)
          .join(''),
      EXTRA,
    )

  test('S2 The words under the Lasso never react [LS-01, LS-N3, LS-N4]', async ({
    page,
  }) => {
    const box =
      await test.step('Given a text box with the words and the Lasso picked with Picks set to Ink only', () =>
        wordsPage(page, { text: false }))
    const text0 = await box.locator('.bn-editor').innerText()
    const r = await wordsBox(page, 0, WORDS.length)
    await test.step('When I draw a loop over the words with the Pencil', async () => {
      await realPen(page, loopRound(r, 10))
      await page.waitForTimeout(600)
    })
    await test.step('Then no word is selected, typed, deleted or moved', async () => {
      expect(await selected(page)).toBe('')
      expect(await box.locator('.bn-editor').innerText()).toBe(text0)
      const after = await wordsBox(page, 0, WORDS.length)
      expect(after).toEqual(r)
      await expect(page.locator(BOX)).toHaveCount(0)
      expect(
        await page.evaluate(() => {
          const s = window.getSelection()
          return !!s && !s.isCollapsed
        }),
      ).toBe(false)
      expect((await savedInk(page)).strokes).toHaveLength(0)
    })
    await test.step("And Apple's own bar does not show (a computer stands in: our own bar is absent too)", async () => {
      await expect(page.locator('[data-mini-toolbar]')).toHaveCount(0)
      expect(
        await page.evaluate(
          () => document.activeElement?.closest('.bn-editor') !== null,
        ),
      ).toBe(false)
    })
  })

  test('S3 With Text picked, a loop takes whole words [LS-13]', async ({
    page,
  }) => {
    await test.step('Given a text box with the words and the Lasso picked with Picks set to Text', () =>
      wordsPage(page, { text: true }))
    const first = WORDS.indexOf('2000')
    const r =
      await test.step('When I draw a loop round "2000 rate-is"', async () => {
        const r = await wordsBox(page, first, WORDS.length)
        // A loop a little wider than the two words, but not touching "23-11".
        await realPen(page, loopRound(r, 5))
        return r
      })
    await test.step('Then exactly "2000 rate-is" is selected', async () => {
      await expect.poll(() => selected(page)).toBe('2000 rate-is')
    })
    void r
  })

  test('LS-13 the middle of a word decides: a loop that only touches the edge of a word leaves it out', async ({
    page,
  }) => {
    await wordsPage(page, { text: true })
    const from = WORDS.indexOf('2000')
    const to = from + '2000 rate-is'.length
    const r = await wordsBox(page, from, to)
    // The loop's right edge cuts "rate-is" in two, before its middle.
    const cut = await wordsBox(
      page,
      WORDS.indexOf('rate-is'),
      WORDS.indexOf('rate-is') + 2,
    )
    const part = { ...r, w: cut.x + cut.w / 2 - r.x }
    await realPen(page, loopRound(part, 4))
    await expect.poll(() => selected(page)).toBe('2000')
  })
})

/* ---------- more lines on the page's own text and drawings ---------- */

/** The words the page marks as selected (our own selection decorations). */
const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

/** The screen box of a phrase inside one text node of the page. */
const phraseRect = (page: Page, phrase: string): Promise<Rect> =>
  page.evaluate((w) => {
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
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    }
    throw new Error('phrase not found: ' + w)
  }, phrase)

/** Where the typing cursor is, in characters of the page's text; null when there is none. */
const caretAt = (page: Page) =>
  page.evaluate(() => {
    const s = window.getSelection()
    const ed = document.querySelector('.bn-editor')
    if (!s || !s.isCollapsed || !s.anchorNode || !ed?.contains(s.anchorNode))
      return null
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    let all = 0
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n === s.anchorNode) return all + s.anchorOffset
      all += (n.textContent ?? '').length
    }
    return null
  })

test.describe('the Lasso: more lines', () => {
  // The finger half of LS-03 (a tap by a finger) places no cursor in the test
  // browser (checked: touch pointer events reach the pad, the caret stays); it
  // is left to the owner's iPad check and reported, not frozen here.
  test('LS-03 a mouse click places the typing cursor there', async ({
    page,
  }) => {
    await drawingsPage(page)
    const dna = await phraseRect(page, 'DNA')
    const nucleus = await phraseRect(page, 'nucleus')
    await page.mouse.click(nucleus.x + nucleus.w / 2, nucleus.y + nucleus.h / 2)
    await expect
      .poll(async () => {
        const c = await caretAt(page)
        return c !== null && c >= 4 && c <= 12
      })
      .toBe(true)
    // A selection of ink is not touched by it: nothing was selected.
    await expect(page.locator(BOX)).toHaveCount(0)
    await page.mouse.click(dna.x + dna.w / 2, dna.y + dna.h / 2)
    await expect.poll(() => caretAt(page)).toBeGreaterThanOrEqual(22)
  })

  test('LS-07 a new loop first lets go of selected words', async ({ page }) => {
    const s = await drawingsPage(page, {
      'ink.lasso': { text: true, ink: true, pictures: false, shape: 'free' },
    })
    const words = await phraseRect(page, 'nucleus holds')
    await realPen(page, loopRound(words, 5))
    await expect.poll(() => marked(page)).toBe('nucleus holds')
    await realPen(page, loopRound(s.a))
    await expect(page.locator(BOX)).toBeVisible()
    expect(await marked(page)).toBe('')
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? ''),
    ).toBe('')
  })

  test('LS-29 a second finger on a selection being dragged twists and moves it', async ({
    page,
  }) => {
    const s = await drawingsPage(page)
    await realPen(page, loopRound(s.a))
    await selectionIsAround(page, s.a)
    const before = (await savedInk(page)).strokes
    const sb = await selBox(page)
    const f1 = { x: sb.x + sb.width * 0.3, y: sb.y + sb.height / 2 }
    const r = sb.width * 0.4
    // The Pencil holds the selection (a drag has begun) ...
    await page.evaluate(() => {
      ;(window as unknown as { __realPen?: boolean }).__realPen = true
    })
    await page.mouse.move(f1.x - 3, f1.y - 6)
    await page.mouse.move(f1.x, f1.y)
    await page.mouse.down()
    await page.mouse.move(f1.x + 1, f1.y + 1)
    // ... and a finger joins and swings a quarter turn round it.
    await page.evaluate(
      async ({ f1, r }) => {
        const make = (name: string, x: number, y: number) =>
          new PointerEvent(name, {
            pointerType: 'touch',
            pointerId: 62,
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
            isPrimary: false,
            button: 0,
            buttons: name === 'pointerup' ? 0 : 1,
            pressure: 0.5,
          })
        const pad = document.querySelector('[data-ink-pad]')!
        pad.dispatchEvent(make('pointerdown', f1.x + r, f1.y))
        for (let i = 1; i <= 12; i++) {
          const a = (i / 12) * (Math.PI / 2)
          pad.dispatchEvent(
            make('pointermove', f1.x + r * Math.cos(a), f1.y + r * Math.sin(a)),
          )
          await new Promise((res) => setTimeout(res, 8))
        }
        pad.dispatchEvent(make('pointerup', f1.x, f1.y + r))
      },
      { f1, r },
    )
    await page.mouse.up()
    await page.evaluate(() => {
      ;(window as unknown as { __realPen?: boolean }).__realPen = false
    })
    await expect
      .poll(async () =>
        (await savedInk(page)).strokes.some(
          (x) => !before.some((o) => o.id === x.id),
        ),
      )
      .toBe(true)
    const { strokes } = await savedInk(page)
    const turned = strokes.find((x) => !before.some((o) => o.id === x.id))!
    // A flat drawing turned a quarter turn is now taller than wide.
    const w = Math.max(...xs(turned.pts)) - Math.min(...xs(turned.pts))
    const h = Math.max(...ys(turned.pts)) - Math.min(...ys(turned.pts))
    expect(h).toBeGreaterThan(w)
  })

  test('LS-46 Circle to lasso: a quick circle round ink selects it and switches to the Lasso', async ({
    page,
  }) => {
    const s = await drawingsPage(page, { 'ink.pen': { circleLasso: true } })
    await tool(page, 'Pen').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const n = 32
    const ring = Array.from({ length: n + 1 }, (_, i) => ({
      x:
        s.a.x +
        s.a.w / 2 +
        (s.a.w / 2 + 24) * Math.cos((i / n) * Math.PI * 2 - 1.2),
      y:
        s.a.y +
        s.a.h / 2 +
        (s.a.h / 2 + 26) * Math.sin((i / n) * Math.PI * 2 - 1.2),
    }))
    await realPen(page, ring)
    await expect(tool(page, 'Lasso')).toHaveAttribute('aria-pressed', 'true')
    await selectionIsAround(page, s.a)
    // The circle itself leaves no ink.
    expect(await drawings(page)).toHaveLength(2)
  })
})
