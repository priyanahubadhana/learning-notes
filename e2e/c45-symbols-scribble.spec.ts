// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { painted, savedInk } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import {
  installRealPen,
  realPen,
  realPenTaps,
  type PenTap,
  type Pt,
} from './realPen.ts'

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
/**
 * The pause (ms) after which taps start a new run: longer than the tap gap
 * (C19: Relaxed, 700 ms, when nothing is picked).
 */
const RUN_APART = 900
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
async function lineBox(page: Page, line = LINE) {
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
  await page.keyboard.insertText(line)
  // WebKit drops an Enter sent in the same moment as insertText: wait for
  // the line to land, then check the box really has three lines.
  await expect(box.locator('.bn-editor')).toContainText(line)
  // WebKit opens the "/" list for an inserted slash too: close it first.
  if (await page.locator('.bn-suggestion-menu').isVisible())
    await page.keyboard.press('Escape')
  await page.keyboard.press('Enter')
  // Two real line breaks (not the editor's trailing one) before the last
  // line is typed: WebKit can run the Enter after the typing otherwise.
  await expect
    .poll(
      () =>
        box.locator('.bn-editor br:not(.ProseMirror-trailingBreak)').count(),
      'two line breaks',
    )
    .toBe(2)
  await page.keyboard.type('Last filler line')
  await expect(box.locator('.bn-editor')).toContainText('Last filler line')
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

/**
 * Quick Pencil taps in a row (real browser input): each about 40 ms long,
 * 90 ms apart, sent on one clock (realPenTaps).
 */
const taps = (page: Page, n: number, at: Pt) =>
  realPenTaps(
    page,
    at,
    Array.from({ length: n }, (_, k) => ({ hold: 40, gap: k ? 90 : 0 })),
  )

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
  await page.waitForTimeout(RUN_APART)
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
      await page.waitForTimeout(RUN_APART)
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
      await page.waitForTimeout(RUN_APART)
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
    await page.waitForTimeout(RUN_APART)
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
  await page.waitForTimeout(RUN_APART)
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
    await page.waitForTimeout(RUN_APART)
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
    await page.waitForTimeout(RUN_APART)
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

test('C4: a quick, small scratch-out that ends where it began still deletes what is under it', async ({
  page,
}) => {
  await start(page, 'C4quick')
  await watchPresses(page)
  const box = await lineBox(page)
  await pickBox(page, box)
  const c = await charBox(page, I.six)
  // Inside the 6's own box: the comma right after it is not touched.
  const left = c.x - 2
  const right = c.x + c.width - 1
  const mid = c.y + c.height / 2
  // Four quick strokes over the 6, back to where the tip came down: from
  // start to end it has not moved at all, like a tap; its path has.
  await pressLog(page)
  await penOn(page)
  await page.mouse.move(left, mid - 4)
  await page.mouse.down()
  for (const [x, y] of [
    [right, mid],
    [left, mid + 4],
    [right, mid],
    [left, mid - 4],
  ])
    await page.mouse.move(x, y)
  await page.mouse.up()
  await penOn(page, false)
  const { ms } = await pressLog(page)
  test.info().annotations.push({
    type: 'scratch-out',
    description: `held ${Math.round(ms[0])} ms (a tap may last 300 ms)`,
  })
  await page.waitForTimeout(150)
  await iPadDelete(page)
  await expect.poll(() => boxText(box)).toContain('Text ① → , a/b')
  // One Undo puts the 6 back.
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => boxText(box)).toContain(LINE)
})

/** Playwright's pointer counts as the Pencil while on. */
const penOn = (page: Page, on = true) =>
  page.evaluate((v) => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = v
  }, on)

/**
 * Records every pointer down and up in the page: when the browser made the
 * event (`timeStamp`, the hand's own timing) and when the page got to it.
 */
const watchPresses = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __presses?: [number, number][] }
    w.__presses = []
    for (const t of ['pointerdown', 'pointerup'])
      document.addEventListener(
        t,
        (e) => w.__presses!.push([e.timeStamp, performance.now()]),
        true,
      )
  })

/**
 * Is this run's real timing in the spec (C14): each tap up to 250 ms, each
 * gap up to 500 ms, by the events' own time stamps? The app times taps by
 * the same time stamps, so every such run must select.
 */
const inSpec = (ms: number[]) =>
  ms.every((v, i) => (i % 2 === 0 ? v <= 250 : v <= 500))

/**
 * The press lengths and gaps (ms) of the last run: `ms` by the events' own
 * time stamps (what the hand did), `seen` by when the page got to them.
 */
const pressLog = async (page: Page) => {
  const out = await page.evaluate(() => {
    const w = window as unknown as { __presses?: [number, number][] }
    const got = w.__presses ?? []
    w.__presses = []
    return got
  })
  const gaps = (k: 0 | 1) =>
    out.map((v, i) => (i ? v[k] - out[i - 1][k] : 0)).slice(1)
  return { ms: gaps(0), seen: gaps(1) }
}

const whole = (ms: number[]) => ms.map(Math.round).join(', ')

/**
 * The browser makes each event a little after the driver sends it (measured
 * 16 Nov on ipad-webkit: 12 ms in the middle, 56 ms at worst; 1 ms on
 * chromium). The driver sends that much early: the delay that 9 of the last
 * 40 presses (or gaps) in 10 stayed under. So a tap asked at 250 ms or a gap
 * asked at 500 ms reaches the page at or just under it, seldom over.
 */
class Lead {
  hold = 30
  gap = 30
  private delays: [number[], number[]] = [[], []]
  learn(asked: number[], ms: number[]) {
    ms.forEach((v, i) => {
      // What the browser added to the time the driver really waited.
      const sent = asked[i] - (i % 2 === 0 ? this.hold : this.gap)
      const kept = this.delays[i % 2]
      kept.push(v - sent)
      if (kept.length > 40) kept.shift()
    })
    const most = (kept: number[], old: number) => {
      if (kept.length < 6) return old
      const by = [...kept].sort((a, b) => a - b)
      return Math.min(120, Math.max(0, by[Math.floor(by.length * 0.9)]))
    }
    this.hold = most(this.delays[0], this.hold)
    this.gap = most(this.delays[1], this.gap)
  }
}

/** The timing the page really got, against the timing asked, for the report. */
function driverProof(runs: { asked: number[]; ms: number[] }[], late: number) {
  const span = (odd: number) => {
    const v = runs.flatMap((r) => r.ms.filter((_, i) => i % 2 === odd))
    return `${Math.round(Math.min(...v))}-${Math.round(Math.max(...v))} ms`
  }
  const off = runs
    .flatMap((r) => r.ms.map((v, i) => Math.abs(v - r.asked[i])))
    .sort((a, b) => a - b)
  const at = (q: number) =>
    Math.round(off[Math.min(off.length - 1, Math.floor(off.length * q))])
  const text = `${runs.length} runs in the spec, all selected; ${late} late runs repeated; taps measured ${span(0)}, gaps ${span(1)}; measured against asked: median ${at(0.5)} ms, 90% within ${at(0.9)} ms, worst ${at(1)} ms`
  test.info().annotations.push({ type: 'pencil timing', description: text })
  console.log(
    `${test.info().project.name} ${test.info().title.slice(0, 28)}: ${text}`,
  )
}

const c14 = (n: 2 | 3) =>
  test(`C14: 50 Pencil ${n === 2 ? 'double' : 'triple'} taps (150-250 ms taps, 5 px drift, 400-500 ms apart) all select; nothing is deleted`, async ({
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
    const lead = new Lead()
    const runs: { asked: number[]; ms: number[] }[] = []
    // A run the PC delivered late (out of the spec by the events' own time
    // stamps) proves nothing about the app: it is repeated, never excused.
    // More than 10 of them and the driver is not a Pencil: the test fails.
    let late = 0
    for (let r = 0; runs.length < 50; r++) {
      const i = spots[r % spots.length]
      const at = await charPoint(page, i, r % 2 ? 'right' : 'left')
      await pressLog(page)
      // The whole range of the spec: taps of 150 to 250 ms with 5 px of
      // drift, 400 to 500 ms apart.
      const run: PenTap[] = []
      const asked: number[] = []
      for (let k = 0; k < n; k++) {
        const gap = k > 0 ? 400 + ((r * 29 + k * 61) % 101) : 0
        const hold = 150 + ((r * 37 + k * 53) % 101)
        if (k > 0) asked.push(gap)
        asked.push(hold)
        run.push({ gap, hold, drift: 5 })
      }
      await realPenTaps(page, at, run, lead)
      const want = n === 3 ? LINE : i === 1 ? 'Text' : LINE[i]
      const { ms, seen } = await pressLog(page)
      expect(ms.length, `repeat ${r}: every down and up arrived`).toBe(
        asked.length,
      )
      lead.learn(asked, ms)
      if (inSpec(ms)) {
        runs.push({ asked, ms })
        await expect
          .poll(
            () => selected(page),
            `repeat ${r}, press/gap ms: ${whole(ms)} (asked ${asked}; the page got to them: ${whole(seen)})`,
          )
          .toBe(want)
      } else {
        late++
        expect(
          late,
          `late runs (repeat ${r}: ${whole(ms)}, asked ${asked})`,
        ).toBeLessThanOrEqual(10)
      }
      await page.waitForTimeout(150)
      expect(await boxText(box), `repeat ${r}`).toBe(before)
      await page.waitForTimeout(RUN_APART)
    }
    driverProof(runs, late)
    expect(runs.length, 'runs in the spec, each one selected').toBe(50)
  })

const c14Selected = () =>
  test('C14: a double tap on a word that is already selected never deletes it', async ({
    page,
  }) => {
    await start(page, 'C14sel')
    await watchPresses(page)
    const box = await lineBox(page)
    await pickBox(page, box)
    const before = await boxText(box)
    const at = await charPoint(page, 1, 'right')
    // Ten double taps in the spec, each of which must select. As in the
    // 50-run tests, a run the PC delivered late is repeated, never excused
    // (at most 3); late or not, nothing may be deleted.
    let done = 0
    let late = 0
    for (let r = 0; done < 10; r++) {
      await pressLog(page)
      await realPenTaps(page, at, [
        { hold: 200, drift: 5 },
        { gap: 400, hold: 210, drift: 6 },
      ])
      const { ms } = await pressLog(page)
      const said = `repeat ${r}, press/gap ms: ${whole(ms)}`
      if (inSpec(ms)) {
        done++
        await expect.poll(() => selected(page), said).toBe('Text')
      } else {
        late++
        expect(late, `late runs (${said})`).toBeLessThanOrEqual(3)
      }
      // What a stray scratch-out would send right after the taps.
      await iPadDelete(page)
      await page.waitForTimeout(200)
      expect(await boxText(box), `repeat ${r}`).toBe(before)
      await page.waitForTimeout(RUN_APART)
    }
  })

/** C19: a long word, so a tap 20 px off the one before is still on it. */
const WORD = 'understanding'
const WORD_LINE = 'Text ' + WORD

const c19 = (n: 2 | 3) =>
  test(`C19: 50 Pencil ${n === 2 ? 'double' : 'triple'} taps in the middle of a word, right after a tap put the cursor there, each next tap 0-20 px off and up to 650 ms later: all select; nothing is deleted`, async ({
    page,
  }) => {
    test.setTimeout(500_000)
    await start(page, 'C19x' + n)
    await watchPresses(page)
    const box = await lineBox(page, WORD_LINE)
    await pickBox(page, box)
    const before = await boxText(box)
    const w0 = WORD_LINE.indexOf(WORD)
    const lead = new Lead()
    let done = 0
    // As in C14: a run the PC delivered late is repeated, never excused.
    let late = 0
    for (let r = 0; done < 50; r++) {
      // A letter in the middle of the word, its left or right half.
      const i = w0 + 4 + (r % 5)
      const side = r % 2 ? 'right' : 'left'
      const at = await charPoint(page, i, side)
      // 1. One tap puts the cursor there; then nothing for a while.
      await realPenTaps(page, at, [{ hold: 80 }])
      await expect
        .poll(() => caretIn(page), `repeat ${r}: the cursor`)
        .toBe(side === 'left' ? i : i + 1)
      await page.waitForTimeout(RUN_APART)
      // 2. A double (triple) tap on the cursor: taps of 120 to 220 ms, the
      // next one 0 to 20 px off (left or right, a little up or down), 300
      // to 650 ms later.
      await pressLog(page)
      const off = ((r * 7) % 21) * (r % 2 ? 1 : -1)
      const run: PenTap[] = []
      const asked: number[] = []
      for (let k = 0; k < n; k++) {
        const gap = k > 0 ? 300 + ((r * 53 + k * 131) % 351) : 0
        const hold = 120 + ((r * 37 + k * 53) % 101)
        if (k > 0) asked.push(gap)
        asked.push(hold)
        run.push({
          gap,
          hold,
          drift: 3,
          dx: k === 1 ? off : k === 2 ? off / 2 : 0,
          dy: k === 0 ? 0 : ((r + k) % 3) - 1,
        })
      }
      await realPenTaps(page, at, run, lead)
      const { ms } = await pressLog(page)
      expect(ms.length, `repeat ${r}: every down and up arrived`).toBe(
        asked.length,
      )
      lead.learn(asked, ms)
      const said = `repeat ${r}, ${off} px off, press/gap ms: ${whole(ms)}`
      if (ms.every((v, k) => (k % 2 === 0 ? v <= 250 : v <= 700))) {
        done++
        await expect
          .poll(() => selected(page), said)
          .toBe(n === 2 ? WORD : WORD_LINE)
      } else {
        late++
        expect(late, `late runs (${said})`).toBeLessThanOrEqual(10)
      }
      await page.waitForTimeout(150)
      expect(await boxText(box), `repeat ${r}`).toBe(before)
      await page.waitForTimeout(RUN_APART)
    }
    expect(done, 'runs in the spec, each one selected').toBe(50)
  })

/**
 * The tests that time real taps run in two rows, each row one test after
 * the other. Why: all four 50-run tests at once (one per worker) starved the
 * test driver itself: a tap asked at 205 ms was sent after 105 ms, the next
 * at 330 ms, and more than 10 runs of 50 had to be repeated (16 Nov,
 * ipad-webkit, first run with the C19 tests). Two at a time is the load the
 * timing was measured under.
 */
for (const n of [2, 3] as const) {
  test.describe(`timed Pencil ${n === 2 ? 'double' : 'triple'} taps`, () => {
    test.describe.configure({ mode: 'default' })
    c14(n)
    if (n === 2) c14Selected()
    c19(n)
  })
}
