// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { painted, savedInk } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { installRealPen, realPen, type Pt } from './realPen.ts'

/**
 * Owner's combined test, 16 Nov (switch textbox.v2 ON), with a real-browser
 * Pencil (e2e/realPen.ts: trusted pointer events relabelled as a pen).
 *
 * C5: symbols in a text box can be picked. On "Text ① → 6, a/b":
 *  - one tap puts the cursor next to the symbol (on its side);
 *  - a double tap selects the symbol (and symbols right next to it);
 *  - a triple tap selects the line;
 *  - the Lasso (Rectangle, Picks: Text) around "① → 6" selects it.
 * C4: a scribble over "6" while "Text" is selected clears that selection at
 * once, the delete the iPad sends then removes only "6", and no ink is left
 * in the box. The iPad's own Scribble cannot run in a browser test: the
 * test plays what it sends (a Pencil stroke, then a delete aimed at the
 * selection the page holds, the C4 cause). Only the real iPad proves that
 * Scribble's recogniser fires and that its grey strokes fade.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const LINE = 'Text ① → 6, a/b'
const rect = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page, name: string) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await installRealPen(page)
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  // The first Pencil the page sees gives the tool bar its Pencil size (the
  // page moves down once); on the iPad that happened long before.
  const main = await rect(page.locator('[data-paper-box="main"]'))
  await realPen(page, [{ x: main.x + 60, y: main.y + 20 }])
  await page.waitForTimeout(400)
}

/** A text box below the main text holding LINE; the box is not picked. */
async function lineBox(page: Page) {
  await typeInEditor(page, 'Main text')
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 90)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  // Filler lines keep the test line clear of the box's corner dots.
  await page.keyboard.type('First filler line')
  await page.keyboard.press('Enter')
  // insertText: a typed "/" would open the slash list.
  await page.keyboard.insertText(LINE)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Last filler line')
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(1000)
  await expect(box).not.toHaveAttribute('data-picked', '')
  return box
}

/**
 * The screen box of character `i` of the box line that starts with "Text".
 * The line may be split into several text nodes (a selection highlight).
 */
const charBox = (page: Page, i: number) =>
  page.evaluate(
    ({ i, sel }) => {
      const ed = document.querySelector(sel + ' .bn-editor')!
      const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
      const at: { n: Node; o: number }[] = []
      let all = ''
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.textContent ?? ''
        for (let o = 0; o < t.length; o++) at.push({ n, o })
        all += t
      }
      const start = all.indexOf('Text')
      if (start < 0) throw new Error('line not found')
      const c = at[start + i]
      const r = document.createRange()
      r.setStart(c.n, c.o)
      r.setEnd(c.n, c.o + 1)
      const b = r.getBoundingClientRect()
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    },
    { i, sel: EXTRA },
  )

/** A point inside character `i`: its left or right half. */
async function charPoint(page: Page, i: number, side: 'left' | 'right') {
  const b = await charBox(page, i)
  return {
    x: b.x + b.width * (side === 'left' ? 0.3 : 0.7),
    y: b.y + b.height / 2,
  }
}

/** Pencil taps in a row (real browser input), about 90 ms apart. */
async function taps(page: Page, n: number, at: { x: number; y: number }) {
  // One pen label for the run: no page call between the taps (WebKit is slow).
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  for (let i = 0; i < n; i++) {
    if (i > 0) await page.waitForTimeout(90)
    await page.mouse.move(at.x - 2, at.y - 4)
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.up()
  }
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}

/** What the page's own selection holds (drawn as `ln-sel`). */
const selected = (page: Page) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(sel + ' .bn-editor .ln-sel')]
        .map((e) => e.textContent)
        .join(''),
    EXTRA,
  )

/** The caret's place in the "Text" line (characters before it), or null. */
const caretIn = (page: Page) =>
  page.evaluate((sel) => {
    const s = window.getSelection()
    if (!s || !s.isCollapsed || !s.anchorNode) return null
    const ed = document.querySelector(sel + ' .bn-editor')!
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    let all = ''
    let caret = -1
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n === s.anchorNode) caret = all.length + s.anchorOffset
      all += n.textContent ?? ''
    }
    if (caret < 0) return null
    return caret - all.indexOf('Text')
  }, EXTRA)

const boxText = (box: Locator) => box.locator('.bn-editor').innerText()

/** The first tap picks the box; the next run starts fresh. */
async function pickBox(page: Page, box: Locator) {
  await realPen(page, [await charPoint(page, 0, 'left')])
  await expect(box).toHaveAttribute('data-picked', '')
  await page.waitForTimeout(600)
}

const I = {
  circled: LINE.indexOf('①'),
  arrow: LINE.indexOf('→'),
  six: LINE.indexOf('6'),
  comma: LINE.indexOf(','),
  slash: LINE.indexOf('/'),
}

test('C5: one Pencil tap on a symbol puts the cursor on that side of it, never at the line start', async ({
  page,
}) => {
  await start(page, 'C5tap')
  const box = await lineBox(page)
  await pickBox(page, box)
  for (const [name, i] of Object.entries(I)) {
    for (const side of ['left', 'right'] as const) {
      await taps(page, 1, await charPoint(page, i, side))
      await expect
        .poll(() => caretIn(page), `${name} ${side}`)
        .toBe(side === 'left' ? i : i + 1)
      await page.waitForTimeout(600)
    }
  }
})

test('C5: a Pencil double tap selects the symbol itself (→ ① , /), a word stays a word', async ({
  page,
}) => {
  await start(page, 'C5dbl')
  const box = await lineBox(page)
  await pickBox(page, box)
  for (const [name, i] of Object.entries(I)) {
    for (const side of ['left', 'right'] as const) {
      await taps(page, 2, await charPoint(page, i, side))
      await expect.poll(() => selected(page), `${name} ${side}`).toBe(LINE[i])
      await page.waitForTimeout(600)
    }
  }
  await taps(page, 2, await charPoint(page, 1, 'right'))
  await expect.poll(() => selected(page)).toBe('Text')
  // Nothing was typed, deleted or moved by the taps.
  await page.waitForTimeout(400)
  expect(await boxText(box)).toContain(LINE)
})

test('C5: a Pencil triple tap on a symbol selects the whole line', async ({
  page,
}) => {
  await start(page, 'C5tri')
  const box = await lineBox(page)
  await pickBox(page, box)
  for (const i of [I.arrow, I.circled, I.slash]) {
    await taps(page, 3, await charPoint(page, i, 'left'))
    await expect.poll(() => selected(page), LINE[i]).toBe(LINE)
    await page.waitForTimeout(700)
  }
  expect(await boxText(box)).toContain(LINE)
})

test('C5: the Lasso (Rectangle, Picks: Text) around "① → 6" selects those symbols', async ({
  page,
}) => {
  await start(page, 'C5lasso')
  const box = await lineBox(page)
  await page.evaluate(() =>
    window.__lnTools!.setLasso({
      shape: 'rect',
      text: true,
      ink: false,
      pictures: false,
    }),
  )
  await tool(page, 'Lasso').click()
  // The Lasso's first Pencil press hides the key hints on the bar (it grows
  // and the page moves down once); on the iPad there are none to hide.
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  await realPen(page, [
    { x: sheet.x + sheet.width - 30, y: sheet.y + sheet.height - 60 },
  ])
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  const a = await charBox(page, I.circled)
  const b = await charBox(page, I.six)
  // The row's height from its plain letters (a circled number's glyph box
  // is taller than the row); the right edge just past the 6's middle.
  const t = await charBox(page, 0)
  const from: Pt = { x: a.x - 6, y: t.y - 3 }
  const to: Pt = { x: b.x + b.width * 0.85, y: t.y + t.height + 3 }
  const path: Pt[] = Array.from({ length: 12 }, (_, k) => ({
    x: from.x + ((to.x - from.x) * k) / 11,
    y: from.y + ((to.y - from.y) * k) / 11,
  }))
  await realPen(page, path)
  await expect.poll(() => selected(page)).toBe('① → 6')
  expect(await boxText(box)).toContain(LINE)
  // A smaller rectangle round the arrow alone picks the arrow.
  await page.keyboard.press('Escape')
  const c = await charBox(page, I.arrow)
  await realPen(page, [
    { x: c.x - 3, y: c.y - 4 },
    { x: c.x + c.width / 2, y: c.y + c.height / 2 },
    { x: c.x + c.width + 3, y: c.y + c.height + 4 },
  ])
  await expect.poll(() => selected(page)).toBe('→')
})

/** A Pencil scratch-out (zigzag) over character `i`. */
async function scribbleOver(page: Page, i: number) {
  const c = await charBox(page, i)
  const pts: Pt[] = []
  for (let k = 0; k <= 8; k++) {
    pts.push({
      // From just left of the character to just past its right edge.
      x: c.x - 3 + (k % 2 ? c.width + 4 : 0),
      y: c.y + 3 + ((c.height - 6) * k) / 8,
    })
  }
  await realPen(page, pts)
}

/**
 * What iPadOS sends after it reads a scratch-out (the C4 cause): a delete
 * aimed at the page's selection. Played as the browser would: a beforeinput,
 * and, if nothing refused it, the delete itself on the browser's selection.
 */
const iPadDelete = (page: Page) =>
  page.evaluate((sel) => {
    const ed = document.querySelector<HTMLElement>(sel + ' .bn-editor')!
    const ev = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
      bubbles: true,
      cancelable: true,
    })
    ed.dispatchEvent(ev)
    if (!ev.defaultPrevented) document.execCommand('delete')
    return ev.defaultPrevented
  }, EXTRA)

test('C4: a scribble over "6" while "Text" is selected clears that selection and deletes only the 6', async ({
  page,
}) => {
  await start(page, 'C4one')
  const box = await lineBox(page)
  await pickBox(page, box)
  await taps(page, 2, await charPoint(page, 1, 'right'))
  await expect.poll(() => selected(page)).toBe('Text')
  await page.waitForTimeout(800)
  const inkBefore = (await savedInk(page)).strokes.length
  await scribbleOver(page, I.six)
  // The old selection is gone the moment the scribble starts over other text.
  await expect.poll(() => selected(page)).toBe('')
  await page.waitForTimeout(150)
  await iPadDelete(page)
  await expect.poll(() => boxText(box)).toContain('Text ① → , a/b')
  expect(await boxText(box)).not.toContain('6,')
  // No ink in the box: nothing saved, nothing painted.
  await page.waitForTimeout(600)
  expect((await savedInk(page)).strokes.length).toBe(inkBefore)
  expect(await painted(page, 'live')).toBe(0)
  // One Undo puts the 6 back.
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => boxText(box)).toContain(LINE)
})

test('C4: ten scribbles in a row each delete only what is under them', async ({
  page,
}) => {
  await start(page, 'C4many')
  const box = await lineBox(page)
  await pickBox(page, box)
  // Each round: select "Text", scribble over the symbol at the end, delete.
  for (let round = 0; round < 10; round++) {
    const before = await boxText(box)
    const line = before.split('\n').find((l) => l.startsWith('Text'))!
    if (line.trim() === 'Text') break
    await taps(page, 2, await charPoint(page, 1, 'right'))
    await expect.poll(() => selected(page), 'round ' + round).toBe('Text')
    await page.waitForTimeout(700)
    const last = line.trimEnd().length - 1
    const gone = line[last]
    await scribbleOver(page, last)
    await page.waitForTimeout(120)
    await iPadDelete(page)
    const now = async () =>
      (await boxText(box)).split('\n').find((l) => l.startsWith('Text')) ?? ''
    // The last character went, and at most the rest of its own word or
    // symbol run with it (the iPad's scratch-out takes whole words); "Text"
    // and everything before that run stay.
    await expect
      .poll(async () => (await now()).length)
      .toBeLessThan(line.length)
    const after = (await now()).trimEnd()
    expect(line.startsWith(after), `round ${round}: ${after}`).toBe(true)
    expect(line.slice(after.length).trim()).not.toMatch(/\s/)
    expect(after.startsWith('Text')).toBe(true)
    expect(gone).not.toBe(' ')
    await page.waitForTimeout(700)
  }
  expect(await boxText(box)).toContain('Text')
  expect(await boxText(box)).toContain('First filler line')
})

test('C4: a delete aimed at the scribbled spot itself still works (nothing refused)', async ({
  page,
}) => {
  await start(page, 'C4aimed')
  const box = await lineBox(page)
  await pickBox(page, box)
  await scribbleOver(page, I.six)
  // The iPad moved the selection onto the 6 first, then deletes it.
  await page.evaluate(
    ({ sel, line, at }) => {
      const ed = document.querySelector(sel + ' .bn-editor')!
      const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (n.textContent !== line) continue
        window.getSelection()!.setBaseAndExtent(n, at, n, at + 1)
      }
    },
    { sel: EXTRA, line: LINE, at: I.six },
  )
  await page.waitForTimeout(100)
  await iPadDelete(page)
  await expect.poll(() => boxText(box)).toContain('Text ① → , a/b')
})

/**
 * One Pencil tap held `hold` ms that drifts `drift` px while down (real
 * browser input), as a hand makes it.
 */
async function slowTap(
  page: Page,
  at: { x: number; y: number },
  hold: number,
  drift: number,
) {
  // The pen label stays on for the whole run (penOn): no page call in between.
  await page.mouse.move(at.x - 2, at.y - 4)
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.waitForTimeout(Math.max(0, hold / 2 - 15))
  await page.mouse.move(at.x + drift * 0.6, at.y + drift * 0.8)
  await page.waitForTimeout(Math.max(0, hold / 2 - 15))
  await page.mouse.up()
}

/** Playwright's pointer counts as the Pencil while on (no page call between taps). */
const penOn = (page: Page, on = true) =>
  page.evaluate((v) => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = v
  }, on)

/** Records every pointer down and up time in the page. */
const watchPresses = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __presses?: number[] }
    w.__presses = []
    for (const t of ['pointerdown', 'pointerup'])
      document.addEventListener(
        t,
        () => w.__presses!.push(performance.now()),
        true,
      )
  })

/**
 * The test driver's timing drifts under load (seen: a 220 ms tap held 326
 * ms, a 370 ms gap 618 ms). Only runs whose real timing is in the spec
 * (each tap up to 250 ms, each gap up to 500 ms) must select; every run must
 * leave the text as it was. 10-20 ms of slack: the page's clock here and the
 * app's own read the same press a few ms apart.
 */
const inSpec = (ms: number[]) =>
  ms.every((v, i) => (i % 2 === 0 ? v <= 240 : v <= 480))

/** The real press lengths and gaps (ms) the page saw, for the log. */
const pressLog = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __presses?: number[] }
    const out = w.__presses ?? []
    w.__presses = []
    return out.map((t, i) => (i ? Math.round(t - out[i - 1]) : 0)).slice(1)
  })

for (const n of [2, 3] as const) {
  test(`C14: 50 Pencil ${n === 2 ? 'double' : 'triple'} taps (150-250 ms taps, 5 px drift, 400-450 ms apart) all select; nothing is deleted`, async ({
    page,
  }) => {
    test.setTimeout(400_000)
    await start(page, 'C14x' + n)
    await watchPresses(page)
    const box = await lineBox(page)
    await pickBox(page, box)
    const before = await boxText(box)
    // "Text" (a word), then the arrow and "6" (symbols, a digit), in turn.
    const spots = [1, I.arrow, I.six]
    let counted = 0
    for (let r = 0; r < 50; r++) {
      const i = spots[r % spots.length]
      const at = await charPoint(page, i, r % 2 ? 'right' : 'left')
      await pressLog(page)
      await penOn(page)
      for (let k = 0; k < n; k++) {
        // About 60 ms of driver time comes on top: about 400-450 ms in the page.
        if (k > 0) await page.waitForTimeout(300 + ((r + k) % 2) * 40)
        // 150-220 ms asked; the driver adds up to about 40 ms.
        await slowTap(page, at, 150 + ((r * 37 + k * 53) % 71), 5)
      }
      await penOn(page, false)
      const want = n === 3 ? LINE : i === 1 ? 'Text' : LINE[i]
      const ms = await pressLog(page)
      if (inSpec(ms)) {
        counted++
        await expect
          .poll(() => selected(page), `repeat ${r}, press/gap ms: ${ms}`)
          .toBe(want)
      }
      await page.waitForTimeout(150)
      expect(await boxText(box), `repeat ${r}`).toBe(before)
      await page.waitForTimeout(650)
    }
    expect(counted, 'runs with in-spec timing').toBeGreaterThanOrEqual(20)
  })
}

test('C14: a double tap on a word that is already selected never deletes it', async ({
  page,
}) => {
  await start(page, 'C14sel')
  await watchPresses(page)
  const box = await lineBox(page)
  await pickBox(page, box)
  const before = await boxText(box)
  const at = await charPoint(page, 1, 'right')
  for (let r = 0; r < 10; r++) {
    await pressLog(page)
    await penOn(page)
    await slowTap(page, at, 200, 5)
    await page.waitForTimeout(340)
    await slowTap(page, at, 210, 6)
    await penOn(page, false)
    const ms = await pressLog(page)
    if (inSpec(ms))
      await expect
        .poll(() => selected(page), `repeat ${r}, press/gap ms: ${ms}`)
        .toBe('Text')
    // What a stray scratch-out would send right after the taps.
    await iPadDelete(page)
    await page.waitForTimeout(200)
    expect(await boxText(box), `repeat ${r}`).toBe(before)
    await page.waitForTimeout(650)
  }
})
