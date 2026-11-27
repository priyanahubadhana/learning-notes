// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { savedInk } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { installRealPen, realPen, type Pt } from './realPen.ts'
import { editableTargetsInRect } from './scribbleProbe.ts'
// The rule's numbers, as in src/paper/textPencil.ts (the e2e build cannot
// import it): the shape waits HOLD_MS for a next stroke; a press within
// WRITING_NEAR_PX of the shape's bounds is close by.
const HOLD_MS = 400
const WRITING_NEAR_PX = 80

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
  await installPenLog(page)
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
  // C27: the default box's bottom margin is outside its frame now (43 px); aim past it.
  return { x: sheet.x + sheet.width * 0.3, y: main.y + main.height + 70 }
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

type PenEv = {
  type: string
  t: number
  x: number
  y: number
  buttons: number
  co: number
}

/**
 * The page's own record of every Pencil event (capture listeners on window,
 * so each is noted before the app sees it, on the page's clock). The TB-37
 * tests read it to prove the timing they claim really happened.
 */
async function installPenLog(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __penLog: unknown[] }
    w.__penLog = []
    for (const type of ['pointerdown', 'pointermove', 'pointerup'])
      window.addEventListener(
        type,
        (e) => {
          const p = e as PointerEvent
          if (!p.isTrusted || p.pointerType !== 'pen') return
          w.__penLog.push({
            type,
            t: performance.now(),
            x: p.clientX,
            y: p.clientY,
            buttons: p.buttons,
            // The points the browser merged into this event (itself included).
            co: p.getCoalescedEvents?.().length ?? 0,
          })
        },
        { capture: true },
      )
  })
}

const penLog = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __penLog: PenEv[] }).__penLog.slice(),
  )
const clearPenLog = (page: Page) =>
  page.evaluate(() => {
    ;(window as unknown as { __penLog: unknown[] }).__penLog = []
  })

type Seen = { down: PenEv; up: PenEv }

/**
 * Each stroke arrived whole and in order: its press at its first point, every
 * move along it with the tip down, its lift at its last point, and its lift
 * before the next stroke's press.
 */
function strokesSeen(log: PenEv[], paths: Pt[][]): Seen[] {
  const ends = log.filter((e) => e.type !== 'pointermove')
  expect(
    ends.map((e) => e.type),
    'each stroke: one press then one lift, in order',
  ).toEqual(paths.flatMap(() => ['pointerdown', 'pointerup']))
  return paths.map((path, i) => {
    const down = ends[2 * i]
    const up = ends[2 * i + 1]
    const last = path[path.length - 1]
    expect(
      Math.hypot(down.x - path[0].x, down.y - path[0].y),
      `stroke ${i + 1}: pressed at its first point`,
    ).toBeLessThan(2)
    expect(
      Math.hypot(up.x - last.x, up.y - last.y),
      `stroke ${i + 1}: lifted at its last point`,
    ).toBeLessThan(2)
    // By the log's order, not its times: while the page's clock stands
    // still (quickPens), all of a stroke's events carry the same time.
    const moves = log
      .slice(log.indexOf(down), log.indexOf(up))
      .filter((e) => e.type === 'pointermove' && e.buttons)
    expect(
      moves.length,
      `stroke ${i + 1}: all its moves arrived with the tip down`,
    ).toBeGreaterThanOrEqual(path.length - 1)
    return { down, up }
  })
}

/**
 * The next stroke was pressed within the hold (on the page's clock, which
 * quickPens holds still across the lift); else the case was never made.
 */
function pressedWithinHold(seen: Seen[]) {
  const gap = seen[1].down.t - seen[0].up.t
  expect(
    gap,
    `the next stroke came ${Math.round(gap)} ms after the lift: this machine ` +
      `could not press it within the ${HOLD_MS} ms hold, so the test proves nothing`,
  ).toBeLessThan(HOLD_MS)
}

/**
 * The saved strokes that are the drawn square made clean: a few corner points
 * (6 numbers each), as wide as the square (points are in box widths, `bw`).
 */
const cleanSquares = (
  strokes: { pts: ArrayLike<number>; bw: number }[],
  size: number,
) =>
  strokes.filter((s) => {
    const xs = Array.from(s.pts).filter((_, i) => i % 6 === 0)
    const w = (Math.max(...xs) - Math.min(...xs)) * s.bw
    return s.pts.length / 6 <= 8 && Math.abs(w - size) < size * 0.1
  })

/**
 * Strokes one after the other with as little between them as the browser
 * allows (the shape waits 400 ms for a next stroke; a slow WebKit round trip
 * between two realPen calls would be longer than that). Returns what the page
 * saw of each stroke, checked whole and in order (strokesSeen).
 *
 * The page's clock (page.clock: its timers, performance.now and Date) stands
 * still from just before the first press until the last stroke's press has
 * arrived, then runs on. Why: WebKit hands the page each input only after a
 * repaint, and on a busy machine a repaint can take a second (CI run
 * 45918658223: 478 ms from lift to press, then "no frame in 3000 ms"; here
 * under load up to 1150 ms while the page itself was idle 30 ms after the
 * lift). On the page's clock the press now comes within the hold whatever
 * the machine's speed: the shape's hold timer cannot run before it. Event
 * timeStamps stay real, so the writing-gap rules see the real times.
 */
async function quickPens(page: Page, paths: Pt[][]): Promise<Seen[]> {
  await page.clock.install()
  // Two seconds on: no stroke is down yet, so this is only a wait before
  // drawing (the timers due in it run now).
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2000)
  await clearPenLog(page)
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  // The lift of one stroke, the move to the next start and its press are sent
  // together, without waiting for each answer: on WebKit each answer takes
  // about 70 ms (a repaint), which put 200 ms between two strokes, half of the
  // 400 ms the shape waits. The moves along a stroke are still sent one by one.
  // Promise.all does not promise the order; strokesSeen checks it.
  const [first, ...more] = paths
  await page.mouse.move(first[0].x, first[0].y)
  await page.mouse.down()
  let path = first
  for (const next of more) {
    for (const q of path.slice(1)) await page.mouse.move(q.x, q.y)
    await Promise.all([
      page.mouse.up(),
      page.mouse.move(next[0].x, next[0].y),
      page.mouse.down(),
    ])
    path = next
  }
  // The last press has arrived: the page's clock runs on (the hold counts).
  await page.clock.resume()
  for (const q of path.slice(1)) await page.mouse.move(q.x, q.y)
  await page.mouse.up()
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
  return strokesSeen(await penLog(page), paths)
}

/** `path` with `k` evenly spaced points on each segment (its first point left out). */
const finePath = (path: Pt[], k: number): Pt[] =>
  path.slice(1).flatMap((q, i) =>
    Array.from({ length: k }, (_, j) => ({
      x: path[i].x + ((q.x - path[i].x) * (j + 1)) / k,
      y: path[i].y + ((q.y - path[i].y) * (j + 1)) / k,
    })),
  )

/**
 * One quick Pencil stroke: the press, then every move sent at once without
 * waiting for each answer (as a fast hand on a busy iPad, where the browser
 * hands the page one move per frame and keeps the rest in
 * getCoalescedEvents), then the lift. Checks the browser really merged the
 * moves and kept every point, or fails saying it did not.
 */
async function burstPen(page: Page, path: Pt[], k = 4) {
  const moves = finePath(path, k)
  await clearPenLog(page)
  await asPen(page, true)
  await page.mouse.move(path[0].x - 3, path[0].y - 6)
  await page.mouse.move(path[0].x, path[0].y)
  await page.mouse.down()
  await Promise.all(moves.map((q) => page.mouse.move(q.x, q.y)))
  await page.mouse.up()
  await asPen(page, false)
  const log = await penLog(page)
  const ends = log.filter((e) => e.type !== 'pointermove')
  expect(
    ends.map((e) => e.type),
    'the burst stroke: one press then one lift',
  ).toEqual(['pointerdown', 'pointerup'])
  const got = log.filter(
    (e) =>
      e.type === 'pointermove' &&
      e.t >= ends[0].t &&
      e.t <= ends[1].t &&
      e.buttons,
  )
  expect(
    got.length,
    `the page got ${got.length} moves for ${moves.length} points sent: this ` +
      'browser did not merge them, so the test does not prove coalescing',
  ).toBeLessThan(moves.length)
  expect(
    got.reduce((n, e) => n + e.co, 0),
    'getCoalescedEvents holds every point sent (the rest of the stroke)',
  ).toBeGreaterThanOrEqual(moves.length)
  const last = moves[moves.length - 1]
  expect(
    Math.hypot(got[got.length - 1].x - last.x, got[got.length - 1].y - last.y),
    'the last move is at the stroke end',
  ).toBeLessThan(2)
}

/**
 * The Pencil guard's numbers (src/app/tapTiming.ts TAP_SPEEDS and
 * TAP_SPEED_KEY, src/editor/penGuard.ts SELECT_GRACE_MS and tapGraceOn):
 * after a Pencil tap on text, no replacement for the tap gap + 200 ms; after
 * a tap selects text, none for 600 ms.
 */
const TAP_SPEEDS: Record<string, number> = {
  quick: 350,
  normal: 500,
  relaxed: 700,
  wide: 1000,
}
const SELECT_GRACE_MS = 600

/**
 * Waits until the guard's own state (`__lnTools.toolState().penGuard`) says
 * its last Pencil lift is older than both graces, and asserts it.
 */
async function penGracesOver(page: Page) {
  const speed = await page.evaluate(() => {
    try {
      return JSON.parse(
        localStorage.getItem('learning-notes:preview.tapSpeed') ?? 'null',
      ) as string | null
    } catch {
      return null
    }
  })
  const grace = Math.max(
    (TAP_SPEEDS[speed ?? ''] ?? TAP_SPEEDS.wide) + 200,
    SELECT_GRACE_MS,
  )
  type Guard = { down: boolean; upAgoMs: number | null }
  const guard = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __lnTools?: { toolState: () => Record<string, unknown> }
          }
        ).__lnTools?.toolState().penGuard as Guard | undefined,
    )
  await expect
    .poll(async () => (await guard())?.upAgoMs ?? -1, {
      message: `the Pencil guard's last lift is over ${grace} ms old`,
    })
    .toBeGreaterThan(grace)
  const g = await guard()
  expect(g?.down, 'no Pencil gesture is going on').toBe(false)
  expect(g?.upAgoMs).toBeGreaterThan(grace)
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
    const seen = await quickPens(page, [
      square(at.x, at.y, 160),
      wavy(at.x + 175, at.y + 60, 60, 8, 8),
    ])
    pressedWithinHold(seen)
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
    const seen = await quickPens(page, [
      square(at.x, at.y, 160),
      wavy(b.x + 10, b.y + 20, 50, 6, 8),
    ])
    pressedWithinHold(seen)
    await page.waitForTimeout(1800)
    await expect(page.locator(EXTRA)).toHaveCount(1)
    expect((await savedInk(page)).strokes).toHaveLength(0)
  })

  test('handwriting close by but after the hold does not cancel: the shape is made in a new box', async ({
    page,
  }) => {
    await start(page, 'TB37late')
    await tool(page, 'Text').click()
    const at = await blank(page, 120)
    const sq = square(at.x, at.y, 160)
    // The same next stroke as in the cancel test, close by.
    const next = wavy(at.x + 175, at.y + 60, 60, 8, 8)
    await clearPenLog(page)
    await realPen(page, sq, 1)
    // Wait on the page's own clock until the hold is over, then press.
    const lift = (await penLog(page)).filter((e) => e.type === 'pointerup')
    expect(lift).toHaveLength(1)
    await page.waitForFunction(({ t, wait }) => performance.now() - t > wait, {
      t: lift[0].t,
      wait: HOLD_MS + 100,
    })
    await realPen(page, next, 1)
    const seen = strokesSeen(await penLog(page), [sq, next])
    expect(seen[1].down.t - seen[0].up.t).toBeGreaterThan(HOLD_MS)
    await page.waitForTimeout(1800)
    await expect(page.locator(EXTRA)).toHaveCount(1)
    // The ink is saved a moment later (about 2 s after the strokes on WebKit):
    // wait for it as the rectangle test does.
    await expect
      .poll(
        async () => cleanSquares((await savedInk(page)).strokes, 160).length,
        { timeout: 8000 },
      )
      .toBe(1)
  })

  test('a quick next stroke far from the shape does not cancel it: the shape is made in a new box', async ({
    page,
  }) => {
    await start(page, 'TB37far')
    await tool(page, 'Text').click()
    const at = await blank(page, 120)
    // "Close" (PaperFrame textPenDown) is a press inside the shape's bounds
    // grown by WRITING_NEAR_PX on each side; this press is 30 px outside it.
    const fx = at.x + 160 + WRITING_NEAR_PX + 30
    const seen = await quickPens(page, [
      square(at.x, at.y, 160),
      wavy(fx, at.y + 60, 60, 8, 8),
    ])
    pressedWithinHold(seen)
    await page.waitForTimeout(1800)
    await expect(page.locator(EXTRA)).toHaveCount(1)
    // The ink is saved a moment later (about 2 s after the strokes on WebKit):
    // wait for it as the rectangle test does.
    await expect
      .poll(
        async () => cleanSquares((await savedInk(page)).strokes, 160).length,
        { timeout: 8000 },
      )
      .toBe(1)
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
    // The settle tap starts the Pencil guard's tap grace (1.2 s), which
    // refuses replacing the 7: a ring that ends inside it is refused
    // (the repeat-11 failure). Start once the guard says it is over.
    await penGracesOver(page)
    await realPen(page, ring)
    await expect(box.locator('.ProseMirror')).toContainText('Step ⑦ done')
    expect((await savedInk(page)).strokes).toHaveLength(0)
    await page.keyboard.press('Control+z')
    await expect(box.locator('.ProseMirror')).toContainText('Step 7 done')
  })

  // Issue #90: a quick stroke reaches the page as a few moves with the rest
  // of its points in getCoalescedEvents; the Text tool must use them all.
  // The rectangle below is the red-first proof of #90. This ring is not: a
  // 92-point burst still reaches the page as about 10 to 13 move events,
  // enough points for a ring even without the merged ones (it passed on the
  // code before the fix). Tried: keeping the page busy during the burst
  // still let 2 to 7 move events through on chromium, so not steadily
  // under 6 points (Playwright sends each move after the last is answered). What it
  // proves: a ring whose moves the browser merged (checked by burstPen)
  // still circles the digit once the guard's graces are over.
  test('a quick ring round a digit, its moves merged by the browser, becomes a circled number after the guard graces', async ({
    page,
  }) => {
    await start(page, 'TB37digitBurst')
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
    // The settle tap starts the Pencil guard's graces, which rightly refuse
    // a replacement of the text meanwhile; the slow ring above comes late
    // enough, a burst does not. Start once the guard says they are over.
    await penGracesOver(page)
    await burstPen(page, ring)
    await expect(box.locator('.ProseMirror')).toContainText('Step ⑦ done')
  })

  test('a quick rectangle on empty paper (moves merged by the browser) still becomes a clean shape in a new box', async ({
    page,
  }) => {
    await start(page, 'TB37rectBurst')
    await tool(page, 'Text').click()
    const at = await blank(page, 120)
    await burstPen(page, square(at.x, at.y, 160), 20)
    await expect(page.locator(EXTRA)).toHaveCount(1)
    await expect
      .poll(
        async () => cleanSquares((await savedInk(page)).strokes, 160).length,
        { timeout: 8000 },
      )
      .toBe(1)
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
    // Why: with the Text tool the box has a spare line under the words (the
    // 'keep writing' line); with the Pen it is gone, so the box is shorter.
    // Measure again, or the stroke lands under the box (TB-41 re-test, C27).
    const pb = (await box.boundingBox())!
    await realPen(page, wavy(pb.x + 30, pb.y + pb.height / 2, 120, 6, 10))
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
    const belowBox = async (page: Page) => {
      await below(page).scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      return (await below(page).boundingBox())!
    }
    /** A spot of paper 60 px under the text (the switch-ON stand-in for the line). */
    const underText = async (page: Page) => {
      const m = (await main(page).boundingBox())!
      return { x: m.x, y: m.y + m.height + 60 }
    }

    test('a drag (Pencil or mouse) on the line under the text puts no caret there and adds no line', async ({
      page,
    }) => {
      await pencilPage(page, 'T5drag' + flag)
      // Owner 17 Nov, 18 Nov (decisions "Hints", "Empty page, tap below"):
      // with the switch ON the line is gone; the same drag on the paper under
      // the text still adds no line and puts no caret in the page text.
      if (flag) await expect(below(page)).toBeHidden()
      else await expect(below(page)).toBeVisible()
      const n0 = await lines(page)
      const b = flag ? await underText(page) : await belowBox(page)
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
      if (flag) {
        // Owner 17/18 Nov: no "Tap here to keep writing" line; a Text-tool tap
        // on the paper under the text makes a box with the caret in it (an
        // empty one goes when left), by Pencil and by mouse alike.
        await tool(page, 'Text').click()
        const extra = page.locator(EXTRA + ' .bn-editor')
        const b = await underText(page)
        await realPen(page, [{ x: b.x + 60, y: b.y + 20 }])
        await expect(extra).toBeFocused()
        await page.evaluate(() =>
          (document.activeElement as HTMLElement).blur(),
        )
        await expect(page.locator(EXTRA)).toHaveCount(0)
        // Elsewhere on the paper: a tap at the same spot right after is the "double tap" that makes no second box.
        await page.mouse.click(b.x + 60, b.y + 110)
        await expect(extra).toBeFocused()
        return
      }
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
