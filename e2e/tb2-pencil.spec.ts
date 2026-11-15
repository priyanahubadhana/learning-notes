// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { savedInk } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { installRealPen, realPen, type Pt } from './realPen.ts'
import { editableTargetsInRect } from './scribbleProbe.ts'

/**
 * Phase 2B, task 2B.11 (switch textbox.v2 ON), the Pencil on paper and in a
 * box: TB-36 handwriting on empty paper makes a box with the ink inside;
 * TB-37 Text tool shapes and circled numbers, handwriting nearby cancels;
 * TB-38 pinch zoom (never the Pencil); TB-39 the "+ box" tag on hover;
 * TB-40 the phone gap tap; TB-41 the Pencil in a box follows the tool.
 * Every Pencil stroke here is the browser's own input (e2e/realPen.ts, L11).
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const TAG = '[data-paper-addbox]'
type Rc = { x: number; y: number; width: number; height: number }

async function start(page: Page, name: string, flag = true) {
  await installRealPen(page)
  if (flag)
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
    )
  await startInMode(page, 'computer')
  // A Pencil press must not flip the device mode in the middle of a test.
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"'),
  )
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

const rect = async (page: Page, sel: string): Promise<Rc> =>
  (await page.locator(sel).first().boundingBox())!

/** A spot of empty paper `down` px under the main box. */
async function blank(page: Page, down = 160) {
  const sheet = await rect(page, '[data-paper-sheet="1"]')
  // The text itself: the Pen tool stretches the box over the whole page.
  const main = await rect(page, '[data-paper-box="main"] .bn-editor')
  return { x: sheet.x + sheet.width * 0.3, y: main.y + main.height + down }
}

/**
 * A spot of empty paper under the Pen tool's page: the default box is a
 * screen tall while an ink tool is out (paperInk rule 4), so the paper starts
 * under it, scrolled into view.
 */
async function blankPen(page: Page) {
  await page.evaluate(() => {
    const sc = document.querySelector('[data-page-scroller]')!
    const box = document.querySelector('[data-paper-box="main"]')!
    sc.scrollTop +=
      box.getBoundingClientRect().bottom -
      (sc.getBoundingClientRect().bottom - 140)
  })
  await page.waitForTimeout(300)
  const sheet = await rect(page, '[data-paper-sheet="1"]')
  const main = await rect(page, '[data-paper-box="main"]')
  return { x: sheet.x + sheet.width * 0.3, y: main.y + main.height + 24 }
}

/** A box with `text` made with the mouse (Text tool), blurred. */
async function oneBox(page: Page, text: string) {
  const at = await blank(page, 60)
  await page.mouse.click(at.x, at.y)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return box
}

const wavy = (x0: number, y: number, w = 220, amp = 14, n = 14): Pt[] =>
  Array.from({ length: n }, (_, i) => ({
    x: x0 + (w * i) / (n - 1),
    y: y + Math.sin((i / (n - 1)) * Math.PI * 3) * amp,
  }))

const square = (x: number, y: number, s: number): Pt[] => [
  { x, y },
  { x: x + s, y },
  { x: x + s, y: y + s },
  { x, y: y + s },
  { x, y },
]

/**
 * Strokes one after the other with as little between them as the browser
 * allows (the shape waits 400 ms for a next stroke; a slow WebKit round trip
 * between two realPen calls would be longer than that).
 */
async function quickPens(page: Page, paths: Pt[][]) {
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  for (const path of paths) {
    await page.mouse.move(path[0].x, path[0].y)
    await page.mouse.down()
    for (const q of path.slice(1)) await page.mouse.move(q.x, q.y)
    await page.mouse.up()
  }
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}

const asPen = (page: Page, on: boolean) =>
  page.evaluate((v) => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = v
  }, on)

test.describe('TB-36 the Pencil on empty paper', () => {
  test('Pen tool: handwriting on empty paper makes a box under the stroke and the stroke goes into its ink', async ({
    page,
  }) => {
    await start(page, 'TB36')
    await tool(page, 'Pen').click()
    await page.waitForTimeout(700)
    const at = await blankPen(page)
    await realPen(page, wavy(at.x, at.y, 160, 8))
    await expect(page.locator(EXTRA)).toHaveCount(1)
    await expect
      .poll(async () => (await savedInk(page)).strokes.length, {
        timeout: 8000,
      })
      .toBe(1)
    const box = page.locator(EXTRA)
    const b = (await box.boundingBox())!
    expect(b.y).toBeLessThan(at.y + 20)
    expect(b.y + b.height).toBeGreaterThan(at.y)
    const ink = await savedInk(page)
    expect(
      await box.evaluate(
        (el, id) => !!el.querySelector(`[data-id="${id}"]`),
        ink.chunks[0].blockId,
      ),
    ).toBe(true)
  })

  test('a Pencil tap (a dot) on empty paper with the Pen tool makes no box and no ink', async ({
    page,
  }) => {
    await start(page, 'TB36dot')
    await tool(page, 'Pen').click()
    await page.waitForTimeout(700)
    const at = await blankPen(page)
    await realPen(page, [at])
    await page.waitForTimeout(800)
    await expect(page.locator(EXTRA)).toHaveCount(0)
    expect((await savedInk(page)).strokes).toHaveLength(0)
  })
})

test.describe('TB-37 the Text tool: shapes and circled numbers', () => {
  test('a rectangle on empty paper becomes a clean shape in a new box, with one Undo', async ({
    page,
  }) => {
    await start(page, 'TB37rect')
    await tool(page, 'Text').click()
    const at = await blank(page, 120)
    await realPen(page, square(at.x, at.y, 160))
    await expect
      .poll(async () => (await savedInk(page)).strokes.length, {
        timeout: 8000,
      })
      .toBe(1)
    const s = (await savedInk(page)).strokes[0]
    // The clean outline (a few corner points), not the shaky stroke.
    expect(s.pts.length / 6).toBeLessThanOrEqual(8)
    await expect(page.locator(EXTRA)).toHaveCount(1)
    // The Pen draws it, then the Text tool is back (a 700 ms timer).
    await page.waitForTimeout(1500)
    await expect(page.locator(EXTRA)).toHaveCount(1)
    await page.keyboard.press('Control+z')
    await expect
      .poll(async () => (await savedInk(page)).strokes.length, {
        timeout: 8000,
      })
      .toBe(0)
  })

  test('handwriting right next to the shape cancels it: no box, no ink', async ({
    page,
  }) => {
    await start(page, 'TB37cancel')
    await tool(page, 'Text').click()
    const at = await blank(page, 120)
    // The next stroke, close by and within the hold: it was handwriting.
    await quickPens(page, [
      square(at.x, at.y, 160),
      wavy(at.x + 175, at.y + 60, 60, 8, 8),
    ])
    await page.waitForTimeout(1800)
    await expect(page.locator(EXTRA)).toHaveCount(0)
    expect((await savedInk(page)).strokes).toHaveLength(0)
  })

  test('handwriting in a box just above the shape also cancels it', async ({
    page,
  }) => {
    await start(page, 'TB37box')
    const box = await oneBox(page, 'Written here')
    await tool(page, 'Text').click()
    await page.waitForTimeout(800)
    const b = (await box.boundingBox())!
    // A shape on blank paper a little under the box.
    const at = { x: b.x + 20, y: b.y + b.height + 30 }
    // Handwriting on the box text, near the shape, before the hold ends.
    await quickPens(page, [
      square(at.x, at.y, 160),
      wavy(b.x + 10, b.y + 20, 50, 6, 8),
    ])
    await page.waitForTimeout(1800)
    await expect(page.locator(EXTRA)).toHaveCount(1)
    expect((await savedInk(page)).strokes).toHaveLength(0)
  })

  test('a ring round a digit becomes a circled number, one Undo', async ({
    page,
  }) => {
    await start(page, 'TB37digit')
    const box = await oneBox(page, 'Step 7 done')
    await tool(page, 'Text').click()
    await page.waitForTimeout(800)
    // A first Pencil tap settles the page (the box moves a little at the first touch).
    const bb = (await box.boundingBox())!
    await realPen(page, [{ x: bb.x + 60, y: bb.y + 20 }])
    await page.waitForTimeout(600)
    const d = await page.evaluate(() => {
      const ed = document.querySelector(
        '[data-paper-box]:not([data-paper-box="main"]) .ProseMirror',
      )!
      const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const i = (n.textContent ?? '').indexOf('7')
        if (i < 0) continue
        const r = document.createRange()
        r.setStart(n, i)
        r.setEnd(n, i + 1)
        const b = r.getBoundingClientRect()
        return { x: b.x, y: b.y, w: b.width, h: b.height }
      }
      return null
    })
    expect(d).not.toBeNull()
    const cx = d!.x + d!.w / 2
    const cy = d!.y + d!.h / 2
    const rx = d!.w / 2 + 10
    const ry = d!.h / 2 - 1
    const ring: Pt[] = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 23) * Math.PI * 2 - Math.PI / 2
      return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }
    })
    await realPen(page, ring)
    await expect(box.locator('.ProseMirror')).toContainText('Step ⑦ done')
    expect((await savedInk(page)).strokes).toHaveLength(0)
    await page.keyboard.press('Control+z')
    await expect(box.locator('.ProseMirror')).toContainText('Step 7 done')
  })
})

/** Two fingers (or two stylus touches) as the touch events a tablet sends. */
async function touches(
  page: Page,
  type: 'touchstart' | 'touchmove' | 'touchend',
  a: Pt,
  b: Pt,
  kind: 'direct' | 'stylus' = 'direct',
) {
  await page.evaluate(
    ({ type, a, b, kind }) => {
      const t = [a, b].map((p, i) => ({
        identifier: i,
        clientX: p.x,
        clientY: p.y,
        touchType: kind,
      }))
      const e = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(e, 'touches', {
        value: type === 'touchend' ? [t[0]] : t,
      })
      document.querySelector('[data-paper-sheet="1"]')!.dispatchEvent(e)
    },
    { type, a, b, kind },
  )
}

const spread = (c: Pt, half: number): [Pt, Pt] => [
  { x: c.x - half, y: c.y },
  { x: c.x + half, y: c.y },
]

test.describe('TB-38 pinch zoom', () => {
  const zoomBtn = (page: Page) =>
    page.getByRole('button', { name: 'Fit width' })
  const width = async (page: Page) =>
    (await rect(page, '[data-paper-sheet="1"]')).width

  test('two fingers zoom in, up to 400 %, and stay where they are let go', async ({
    page,
  }) => {
    await start(page, 'TB38in')
    const w0 = await width(page)
    const c = await blank(page, 40)
    await touches(page, 'touchstart', ...spread(c, 50))
    await touches(page, 'touchmove', ...spread(c, 80))
    await expect(zoomBtn(page)).toHaveText('160 %')
    await touches(page, 'touchend', ...spread(c, 80))
    await page.waitForTimeout(500)
    await expect(zoomBtn(page)).toHaveText('160 %')
    expect(await width(page)).toBeGreaterThan(w0 * 1.5)
    // A huge spread stops at 400 %.
    await touches(page, 'touchstart', ...spread(c, 20))
    await touches(page, 'touchmove', ...spread(c, 400))
    await expect(zoomBtn(page)).toHaveText('400 %')
    await touches(page, 'touchend', ...spread(c, 400))
  })

  test('pinching below fit gives way, then springs back to 100 %', async ({
    page,
  }) => {
    await start(page, 'TB38out')
    const w0 = await width(page)
    const c = await blank(page, 40)
    await touches(page, 'touchstart', ...spread(c, 100))
    await touches(page, 'touchmove', ...spread(c, 80))
    await expect.poll(() => width(page)).toBeLessThan(w0)
    await touches(page, 'touchend', ...spread(c, 80))
    await expect(zoomBtn(page)).toHaveText('100 %')
    await expect.poll(() => width(page)).toBeCloseTo(w0, 0)
  })

  test('the Pencil never zooms: stylus touches and a Pencil stroke leave the zoom alone', async ({
    page,
  }) => {
    await start(page, 'TB38pen')
    const c = await blank(page, 40)
    await touches(page, 'touchstart', ...spread(c, 50), 'stylus')
    await touches(page, 'touchmove', ...spread(c, 150), 'stylus')
    await touches(page, 'touchend', ...spread(c, 150), 'stylus')
    await tool(page, 'Pen').click()
    await page.waitForTimeout(700)
    await realPen(page, wavy(c.x, c.y + 60))
    await page.waitForTimeout(500)
    await expect(zoomBtn(page)).toHaveText('100 %')
  })
})

test.describe('TB-39 the "+ box" tag', () => {
  test('hovering the Pencil or the mouse over empty paper shows the tag; a finger, or the Pen tool, does not', async ({
    page,
  }) => {
    await start(page, 'TB39')
    await tool(page, 'Text').click()
    const at = await blank(page, 140)
    // The mouse.
    await page.mouse.move(at.x - 5, at.y - 5)
    await page.mouse.move(at.x, at.y)
    await expect(page.locator(TAG)).toBeVisible()
    await page.mouse.move(at.x, at.y + 30)
    // The Pencil's hover (no button) is a pen move.
    await asPen(page, true)
    await page.mouse.move(at.x + 20, at.y)
    await page.mouse.move(at.x + 24, at.y + 4)
    await expect(page.locator(TAG)).toBeVisible()
    await asPen(page, false)
    // A finger: no tag.
    await page.mouse.move(5, 5)
    await expect(page.locator(TAG)).toHaveCount(0)
    await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)!.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'touch',
            pointerId: 3,
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        ),
      at,
    )
    await expect(page.locator(TAG)).toHaveCount(0)
    // The Pen tool draws here: no tag.
    await tool(page, 'Pen').click()
    await page.waitForTimeout(700)
    await page.mouse.move(at.x, at.y + 10)
    await page.mouse.move(at.x + 6, at.y + 14)
    await expect(page.locator(TAG)).toHaveCount(0)
  })
})

test.describe('TB-40 phone: the gap under a box', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('a Text-tool tap in the gap under a box adds a new box right after it', async ({
    page,
  }) => {
    await start(page, 'TB40')
    await tool(page, 'Text').click()
    // The first box: a tap in the gap under the page's own text.
    const main = await rect(page, '[data-paper-box="main"] .bn-editor')
    await page.mouse.click(main.x + main.width / 2, main.y + main.height + 24)
    const boxes = page.locator(EXTRA)
    await expect(boxes).toHaveCount(1)
    await expect(boxes.locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('One')
    await page.waitForTimeout(700)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.waitForTimeout(900)
    const first = (await boxes.first().boundingBox())!
    await page.mouse.click(
      first.x + first.width / 2,
      first.y + first.height + 20,
    )
    await expect(boxes).toHaveCount(2)
    await page.waitForTimeout(600)
    // The box with the text and the new one, whatever their order in the page.
    const one = (await boxes.filter({ hasText: 'One' }).boundingBox())!
    const added = (await boxes.filter({ hasNotText: 'One' }).boundingBox())!
    expect(added.y).toBeGreaterThan(one.y + one.height - 2)
  })
})

test.describe('TB-41 the Pencil in a box follows the tool', () => {
  test('Text tool: handwriting in a box is left to Scribble: an editable box under the stroke, no ink', async ({
    page,
  }) => {
    await start(page, 'TB41text')
    const box = await oneBox(page, 'Alpha beta gamma delta')
    await tool(page, 'Text').click()
    await page.waitForTimeout(700)
    const b = (await box.boundingBox())!
    const y = b.y + b.height / 2
    const path = wavy(b.x + 30, y, 200, 8)
    // What Scribble would write into: the box's own editor.
    const targets = await editableTargetsInRect(page, {
      x: b.x + 30,
      y: y - 10,
      width: 200,
      height: 20,
    })
    expect(targets.join(' ')).toContain('tiptap')
    await realPen(page, path)
    await page.waitForTimeout(900)
    expect((await savedInk(page)).strokes).toHaveLength(0)
    await expect(box).toContainText('Alpha beta gamma delta')
  })

  test('Pen tool: a stroke in a box stays ink in that box; the text is untouched and the stroke is never converted', async ({
    page,
  }) => {
    await start(page, 'TB41pen')
    const box = await oneBox(page, 'Step 7 here')
    await tool(page, 'Pen').click()
    await page.waitForTimeout(700)
    const b = (await box.boundingBox())!
    const y = b.y + b.height / 2
    // Nothing editable lies under the stroke for Scribble to take.
    expect(
      await editableTargetsInRect(page, {
        x: b.x + 30,
        y: y - 10,
        width: 200,
        height: 20,
      }),
    ).toEqual([])
    await realPen(page, wavy(b.x + 30, y, 200, 8))
    await expect
      .poll(async () => (await savedInk(page)).strokes.length, {
        timeout: 8000,
      })
      .toBe(1)
    const ink = await savedInk(page)
    expect(
      await box.evaluate(
        (el, id) => !!el.querySelector(`[data-id="${id}"]`),
        ink.chunks[0].blockId,
      ),
    ).toBe(true)
    await expect(box).toContainText('Step 7 here')
    // A ring (a drawing) round the digit stays a drawing.
    const r = await page.evaluate(() => {
      const ed = document.querySelector(
        '[data-paper-box]:not([data-paper-box="main"]) .ProseMirror',
      )!
      const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
      const n = w.nextNode()!
      const i = (n.textContent ?? '').indexOf('7')
      const rg = document.createRange()
      rg.setStart(n, i)
      rg.setEnd(n, i + 1)
      const q = rg.getBoundingClientRect()
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 }
    })
    const ring: Pt[] = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 23) * Math.PI * 2
      return { x: r.x + Math.cos(a) * 14, y: r.y + Math.sin(a) * 14 }
    })
    await realPen(page, ring)
    await expect
      .poll(async () => (await savedInk(page)).strokes.length, {
        timeout: 8000,
      })
      .toBe(2)
    await expect(box).toContainText('Step 7 here')
    await expect(box).not.toContainText('⑦')
  })

  test('Text tool, then Pen tool: the same box answers the tool in use, a Pencil tap opens no keyboard', async ({
    page,
  }) => {
    await start(page, 'TB41switch')
    const box = await oneBox(page, 'Switch me')
    const b = (await box.boundingBox())!
    await tool(page, 'Text').click()
    await page.waitForTimeout(700)
    await realPen(page, [{ x: b.x + 40, y: b.y + b.height / 2 }])
    await expect(box.locator('.ProseMirror')).toHaveAttribute(
      'inputmode',
      'none',
    )
    await tool(page, 'Pen').click()
    await page.waitForTimeout(700)
    await realPen(page, wavy(b.x + 30, b.y + b.height / 2, 120, 6, 10))
    await expect
      .poll(async () => (await savedInk(page)).strokes.length, {
        timeout: 8000,
      })
      .toBe(1)
  })
})

test('switch OFF: the Pencil on empty paper still makes a box with ink (nothing changes)', async ({
  page,
}) => {
  await start(page, 'TB36off', false)
  await tool(page, 'Pen').click()
  await page.waitForTimeout(700)
  const at = await blankPen(page)
  await realPen(page, wavy(at.x, at.y, 160, 8))
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect
    .poll(async () => (await savedInk(page)).strokes.length, { timeout: 8000 })
    .toBe(1)
})

/**
 * T5 (owner, 15 Nov): a press that moves on the page is a scroll, never a tap.
 * The "Tap here to keep writing" line used to take the lift of a Pencil drag
 * as a tap: a new last line, the caret there, the page jumped to its end.
 * Switch OFF and ON alike.
 */
for (const flag of [false, true]) {
  test.describe(`T5 a drag is not a tap (switch ${flag ? 'ON' : 'OFF'})`, () => {
    async function pencilPage(page: Page, name: string) {
      await installRealPen(page)
      if (flag)
        await page.addInitScript(() =>
          localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
        )
      await startInMode(page, 'pencil')
      await page.addInitScript(() =>
        localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"'),
      )
      await page.goto('/')
      await createNotebook(page, 'Paper', name)
      await typeInEditor(page, 'Only line')
      await page.waitForTimeout(800)
    }
    const below = (page: Page) => page.locator('.ln-tap-below')
    const lines = (page: Page) =>
      page.locator('[data-paper-box="main"] .bn-block-content').count()

    const main = (page: Page) =>
      page.locator('[data-paper-box="main"] .bn-editor')

    test('a drag (Pencil or mouse) on the line under the text puts no caret there and adds no line', async ({
      page,
    }) => {
      await pencilPage(page, 'T5drag' + flag)
      await expect(below(page)).toBeVisible()
      const n0 = await lines(page)
      await below(page).scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      const b = (await below(page).boundingBox())!
      const x = b.x + 60
      const down = [
        { x, y: b.y + 6 },
        { x, y: b.y + 20 },
        { x, y: b.y + 36 },
      ]
      await realPen(page, down)
      await page.waitForTimeout(400)
      // The mouse: the browser sends a click after any press and lift on one element.
      await page.mouse.move(down[0].x, down[0].y)
      await page.mouse.down()
      await page.mouse.move(x, b.y + 38, { steps: 6 })
      await page.mouse.up()
      await page.waitForTimeout(500)
      expect(await lines(page)).toBe(n0)
      await expect(main(page)).not.toBeFocused()
    })

    test('a Pencil tap and a mouse click on the line under the text still put the caret there', async ({
      page,
    }) => {
      await pencilPage(page, 'T5tap' + flag)
      await below(page).scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      const b = (await below(page).boundingBox())!
      await realPen(page, [{ x: b.x + 60, y: b.y + 20 }])
      await expect(main(page)).toBeFocused()
      await page.evaluate(() => (document.activeElement as HTMLElement).blur())
      // The first tap added a line: the button moved down.
      await below(page).scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      const b2 = (await below(page).boundingBox())!
      await page.mouse.click(b2.x + 60, b2.y + 20)
      await expect(main(page)).toBeFocused()
    })
  })
}

/**
 * T23 (owner, 15 Nov): an empty new box (no text, no ink, no picture) deletes
 * itself when you leave it, whatever its style (the green fill from "use for
 * new boxes" kept two empty boxes on the page). Switch OFF and ON.
 */
for (const flag of [false, true]) {
  test(`T23 an empty styled box goes when left, tapping elsewhere or the title (switch ${flag ? 'ON' : 'OFF'})`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'learning-notes:settings.override.v1',
        JSON.stringify({
          'paper.boxStyleDefault': { bg: 'lime', border: 'lime', radius: 12 },
        }),
      ),
    )
    await start(page, 'T23' + flag, flag)
    await tool(page, 'Text').click()
    const at = await blank(page, 60)
    await page.mouse.click(at.x, at.y)
    const boxes = page.locator(EXTRA)
    await expect(boxes).toHaveCount(1)
    await expect(boxes.locator('.bn-editor')).toBeFocused()
    // Left by tapping empty paper elsewhere: the first goes, the new one waits.
    await page.mouse.click(at.x + 200, at.y + 120)
    await page.waitForTimeout(1500)
    await expect(boxes).toHaveCount(1)
    await page.getByRole('textbox', { name: 'Page title' }).click()
    await expect(boxes).toHaveCount(0)
  })
}

/**
 * T5 (owner, Pencil): a Pencil press and drag on the page never selects a box
 * and never jumps the page to its end (Text tool: the Pencil writes; Lasso:
 * it draws the loop). Switch OFF and ON.
 */
for (const flag of [false, true])
  for (const name of ['Text', 'Lasso'])
    test(`T5 a Pencil drag with the ${name} tool on a long page: no box picked, no jump (switch ${flag ? 'ON' : 'OFF'})`, async ({
      page,
    }) => {
      await installRealPen(page)
      if (flag)
        await page.addInitScript(() =>
          localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
        )
      await page.addInitScript(() =>
        localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"'),
      )
      await startInMode(page, 'pencil')
      await page.goto('/')
      await createNotebook(page, 'Paper', 'T5pen' + name + flag)
      await typeInEditor(page, 'Line one')
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Enter')
        await page.keyboard.type('Row ' + i)
      }
      await page.waitForTimeout(900)
      await page.evaluate(() => {
        document.querySelector('[data-page-scroller]')!.scrollTop = 400
      })
      await tool(page, name).click()
      await page.waitForTimeout(800)
      const top = () =>
        page.evaluate(
          () => document.querySelector('[data-page-scroller]')!.scrollTop,
        )
      const s0 = await top()
      const sheet = await rect(page, '[data-paper-sheet="1"]')
      // In the margin beside the text, and across the text itself.
      for (const x of [sheet.x + 8, sheet.x + sheet.width / 2]) {
        await realPen(
          page,
          Array.from({ length: 10 }, (_, i) => ({ x, y: 300 + i * 25 })),
        )
        await page.waitForTimeout(700)
      }
      expect(await page.locator('[data-picked]').count()).toBe(0)
      expect(Math.abs((await top()) - s0)).toBeLessThan(5)
      // Nothing jumped to a new last line either.
      await expect(page.locator('.ln-tap-below')).not.toBeFocused()
    })
