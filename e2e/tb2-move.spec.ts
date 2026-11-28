// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { savedInk } from './inkHelpers.ts'
import { installRealPen } from './realPen.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Phase 2B, task 2B.7 (switch textbox.v2 ON): TB-11 hold the tab 120 ms and the
 * box lifts; only the tab moves it. TB-12 nothing else reacts mid-drag. TB-13
 * boxes slide aside, a 2 px outline marks the landing. TB-14 a 200 ms glide,
 * one Undo, tappable after. TB-15 free box on blank paper. TB-16 edge scroll.
 * TB-17 Esc returns it. TB-18 a dropped lift ends the drag within 4 s.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
// The hold that lifts a box (HOLD_MS in src/paper/v2/boxDrag.ts, pinned by
// boxDrag.test.ts), counted from the press.
const HOLD_MS = 120
const rect = async (l: Locator) => (await l.boundingBox())!
const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
const away = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

async function start(page: Page, name: string) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
}

async function addBox(page: Page, lines: string[], fx = 0.3, down = 60) {
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetEl.count())
    ? await rect(sheetEl)
    : { x: 0, width: 300 }
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const n = await page.locator(EXTRA).count()
  await page.mouse.click(
    sheet.x + sheet.width * fx,
    main.y + main.height + down,
  )
  const box = page.locator(EXTRA).nth(n)
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  for (const [i, l] of lines.entries()) {
    if (i > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return box
}

/** Two boxes, one under the other; the second one is selected. */
async function twoBoxes(page: Page, name: string) {
  await start(page, name)
  await typeInEditor(page, 'Main text')
  const a = await addBox(page, ['Alpha', 'One'])
  const b = await addBox(page, ['Beta', 'Two'], 0.3, 280)
  await pickBox(page, b)
  return { a, b }
}

const grip = (box: Locator) => box.locator('[data-box-grip]')

/** Press the tab, hold, move; leave the finger down when `up` is false. */
async function dragTab(
  page: Page,
  box: Locator,
  to: (from: { x: number; y: number }) => { x: number; y: number },
  o: { hold?: number; up?: boolean } = {},
) {
  const from = await centre(grip(box))
  const end = to(from)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(o.hold ?? 170)
  await page.mouse.move(end.x, end.y, { steps: 10 })
  if (o.up !== false) await page.mouse.up()
  return { from, end }
}

test('TB-11 hold the tab 120 ms: the box lifts (scale 1.02, elevation 3); a flick with no hold does not drag', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB11a')
  const f0 = await rect(b)
  const from = await centre(grip(b))
  // A quick flick (no hold) is no drag.
  await page.mouse.move(from.x, from.y)
  // Press, moves and lift reach the page in one go, like a finger. Why (CI
  // run 45990737316, chromium): each awaited mouse step returns only once the
  // page has handled it; on a slow runner the gap passed the 120 ms hold
  // (counted from the press), so the box lifted between the two moves and the
  // second one moved it 101 px: a hold, not a flick (reproduced with a 150 ms
  // gap: 101.34 px). Sent together with Promise.all, the lift overtook the
  // moves. So the page sends them itself, to the tab, as the captured pointer.
  const flick = await page.evaluate(
    ({ x, y }) => {
      const tab = document.elementFromPoint(x, y)!.closest('[data-box-grip]')!
      const send = (type: string, dx: number, dy: number, buttons: number) =>
        tab.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: type === 'pointermove' ? -1 : 0,
            buttons,
            clientX: x + dx,
            clientY: y + dy,
          }),
        )
      const t0 = performance.now()
      send('pointerdown', 0, 0, 1)
      const took = document.documentElement.hasAttribute('data-box-drag')
      send('pointermove', 2.5, 100, 1)
      send('pointermove', 5, 200, 1)
      const gap = performance.now() - t0
      send('pointerup', 5, 200, 0)
      return { took, gap }
    },
    { x: from.x, y: from.y },
  )
  expect(flick.took, 'the press on the tab started a drag').toBe(true)
  // The flick is a flick only if its moves came inside the hold.
  expect(
    flick.gap,
    `the flick's moves came ${Math.round(flick.gap)} ms after the press, past the ${HOLD_MS} ms hold: not a flick, this run cannot test it`,
  ).toBeLessThan(HOLD_MS)
  await page.waitForTimeout(500)
  expect(away(await rect(b), f0)).toBeLessThan(3)
  // The lift ended the flick: nothing is left lifted for the hold below.
  await expect(b).not.toHaveAttribute('data-lifted', '')
  await expect(page.locator('html')).not.toHaveAttribute('data-box-drag', '')
  // Holding makes it lift.
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await expect(b).toHaveAttribute('data-lifted', '', { timeout: 600 })
  // The lift is a 120 ms transition: wait for it to end, then it must be
  // exactly the lifted look. Why not a poll of the computed transform (CI run
  // 46076474347, ipad-webkit): WebKit hands out the animated value of its last
  // paint, not of now (seen held at 1.014047 for 100 ms after the transition
  // had finished); the poll took a read of "1.02" as the end and the read 18 ms
  // later gave less. So: the transition's own end, then the paint that shows
  // it, then one read.
  const look = await b.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished))
    await new Promise((done) => requestAnimationFrame(done))
    const cs = getComputedStyle(el)
    return { t: cs.transform, s: cs.boxShadow }
  })
  expect(look.t.startsWith('matrix(1.02')).toBe(true)
  expect(look.s).not.toBe('none')
  await page.mouse.up()
})

test('TB-11 a drag on the border, the text or a dot never moves the box', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB11b')
  const f = await rect(b)
  const tries = [
    { x: f.x + f.width / 2, y: f.y - 5 }, // top border strip
    { x: f.x - 5, y: f.y + f.height / 2 }, // left border strip
    { x: f.x + 30, y: f.y + f.height / 2 }, // the text
    { x: f.x + f.width, y: f.y + f.height / 2 }, // a dot (east)
  ]
  for (const at of tries) {
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.waitForTimeout(200)
    await page.mouse.move(at.x, at.y + 160, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(400)
    await expect(page.locator('html')).not.toHaveAttribute('data-box-drag', '')
    expect((await rect(b)).y).toBeCloseTo(f.y, -1)
  }
})

test('TB-12 while a box is dragged a tap on another box, the Lasso, a new box, the toolbar, the bar and the keyboard do not react', async ({
  page,
}) => {
  const { a, b } = await twoBoxes(page, 'TB12')
  await dragTab(page, b, (f) => ({ x: f.x + 20, y: f.y + 30 }), { up: false })
  await expect(page.locator('html')).toHaveAttribute('data-box-drag', '')
  const pen = tool(page, 'Pen')
  expect(await pen.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe(
    'none',
  )
  // Q-1 (17 Nov): no ⋯ on the frame; the bar (and its ⋯) is not shown while dragging.
  await expect(b.locator('[data-box-menu]')).toHaveCount(0)
  await expect(b.getByTestId('ob-boxmore')).toHaveCount(0)
  // A second finger taps: another box, the Lasso tool, blank paper (a new box).
  const ar = await rect(a)
  await page.touchscreen.tap(ar.x + ar.width / 2, ar.y + ar.height / 2)
  const lasso = await rect(tool(page, 'Lasso'))
  await page.touchscreen.tap(
    lasso.x + lasso.width / 2,
    lasso.y + lasso.height / 2,
  )
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  await page.touchscreen.tap(sheet.x + sheet.width * 0.7, ar.y + ar.height + 15)
  await page.waitForTimeout(500)
  await page.keyboard.type('zzz')
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await expect(a).not.toHaveAttribute('data-picked', '')
  await expect(a.locator('.bn-editor')).not.toBeFocused()
  await expect(tool(page, 'Lasso')).not.toHaveAttribute('aria-pressed', 'true')
  await expect(a).not.toContainText('zzz')
  await expect(b).not.toContainText('zzz')
  await page.mouse.up()
  await page.waitForTimeout(700)
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await expect(page.locator('html')).not.toHaveAttribute('data-box-drag', '')
  await expect(page.locator('html')).not.toHaveAttribute('data-grip-drag', '')
})

test('TB-13 other boxes slide aside live; a 2 px accent outline marks the landing cell', async ({
  page,
}) => {
  const { a, b } = await twoBoxes(page, 'TB13')
  const a0 = await rect(a)
  await dragTab(page, b, () => ({ x: a0.x + a0.width / 2, y: a0.y + 4 }), {
    up: false,
  })
  await page.waitForTimeout(300)
  const ghost = page.locator('[data-grid-ghost]')
  await expect(ghost).toHaveCount(1)
  expect(await ghost.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe(
    '2px',
  )
  // Alpha has slid aside while the finger is still down.
  await expect.poll(async () => away(await rect(a), a0)).toBeGreaterThan(20)
  await page.mouse.up()
})

test('TB-14 the drop glides 200 ms, is not tappable until it lands, says "Box moved" and one Undo puts it back', async ({
  page,
}) => {
  const { a, b } = await twoBoxes(page, 'TB14')
  const f0 = await rect(b)
  const a0 = await rect(a)
  // Dropped into a row (above Alpha): it lands a good way from where it was let go.
  await dragTab(page, b, () => ({ x: a0.x + a0.width * 0.85, y: a0.y + 4 }), {
    up: false,
  })
  await page.waitForTimeout(300)
  // The glide lasts 200 ms; a slow CI runner can take longer than that just to
  // answer a check, so the page itself records the glide as it happens.
  // Why (CI reds 4): the box's element can be a new one after the drop (it moves
  // to another row), so the page watches the box by its id, not the old element.
  const id = await b.getAttribute('data-paper-box')
  await page.evaluate((boxId) => {
    const w = window as unknown as { glide?: { seen: boolean; pe: string } }
    w.glide = { seen: false, pe: '' }
    // A record says the attribute was set, even when the glide has ended by the
    // time a slow machine runs this callback; the pointer rule is read from a
    // probe that carries the same two attributes.
    const probe = () => {
      const p = document.createElement('div')
      p.setAttribute('data-paper-box', boxId ?? '')
      p.setAttribute('data-gliding', '')
      document.body.appendChild(p)
      const pe = getComputedStyle(p).pointerEvents
      p.remove()
      return pe
    }
    const mo = new MutationObserver((list) => {
      // The box may come back as a new element that already carries the attribute.
      const live = document.querySelector<HTMLElement>(
        '[data-paper-box="' + boxId + '"][data-gliding]',
      )
      if (live && !w.glide!.seen) {
        w.glide = { seen: true, pe: getComputedStyle(live).pointerEvents }
        mo.disconnect()
        return
      }
      for (const m of list) {
        const el = m.target as HTMLElement
        if (
          m.attributeName === 'data-gliding' &&
          m.oldValue === null &&
          el.getAttribute('data-paper-box') === boxId &&
          !w.glide!.seen
        ) {
          w.glide = {
            seen: true,
            pe: el.hasAttribute('data-gliding')
              ? getComputedStyle(el).pointerEvents
              : probe(),
          }
          mo.disconnect()
        }
      }
    })
    mo.observe(document.body, {
      attributes: true,
      attributeOldValue: true,
      childList: true,
      attributeFilter: ['data-gliding'],
      subtree: true,
    })
  }, id)
  await page.mouse.up()
  const glide = () =>
    page.evaluate(
      () =>
        (window as unknown as { glide: { seen: boolean; pe: string } }).glide,
    )
  await expect
    .poll(async () => {
      const g = await glide()
      // CI evidence (run 45582678197 lost its failure text): what the page saw.
      console.log(
        'TB-14 DBG ' +
          JSON.stringify({
            g,
            now: await page.evaluate(() => ({
              gliding: document.querySelectorAll('[data-gliding]').length,
              reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
              moved: !!document.querySelector('[data-paper-box]'),
              toast: document.body.innerText.includes('Box moved'),
            })),
          }),
      )
      return g.seen
    })
    .toBe(true)
  expect((await glide()).pe).toBe('none')
  await expect(b).not.toHaveAttribute('data-gliding', '', { timeout: 1000 })
  await expect(page.getByText('Box moved')).toBeVisible()
  expect(away(await rect(b), f0)).toBeGreaterThan(60)
  // No tick to confirm: the drop is final and Undo is the way back.
  await expect(
    page.getByRole('button', { name: /^(✓|Done|Confirm)$/ }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect.poll(async () => away(await rect(b), f0)).toBeLessThan(3)
})

test('TB-15 a drop on blank paper keeps a free box at the dropped left edge, its width kept', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB15')
  // C27: a new box is the whole line wide; narrow it so it can be dropped to the right.
  const e = await centre(b.locator('[data-resize-handle="e"]'))
  await page.mouse.move(e.x, e.y)
  await page.mouse.down()
  await page.waitForTimeout(170)
  await page.mouse.move(e.x - 300, e.y, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const f0 = await rect(b)
  await dragTab(page, b, (f) => ({ x: f.x + 300, y: f.y + 260 }))
  await page.waitForTimeout(800)
  const r = await rect(b)
  expect(Math.abs(r.width - f0.width)).toBeLessThan(3)
  expect(r.x - f0.x).toBeGreaterThan(250)
  expect(r.x - f0.x).toBeLessThan(350)
})

test('TB-16 holding near the bottom edge scrolls the page and the box follows the paper', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB16')
  const scroller = page.locator('[data-page-scroller]')
  const top0 = await scroller.evaluate((s) => s.scrollTop)
  await dragTab(page, b, (f) => ({ x: f.x, y: 1080 }), { up: false })
  // The edge scroll runs while the finger is held: wait for it (a slow CI
  // runner starts it late), the box held all along.
  await expect
    .poll(() => scroller.evaluate((s) => s.scrollTop))
    .toBeGreaterThan(top0 + 20)
  await page.mouse.up()
})

test('TB-17 Esc during a drag: the box returns and nothing is saved', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB17')
  const f0 = await rect(b)
  await dragTab(page, b, (f) => ({ x: f.x + 200, y: f.y + 200 }), {
    up: false,
  })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await page.waitForTimeout(600)
  expect(away(await rect(b), f0)).toBeLessThan(3)
  await expect(page.getByText('Box moved')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-box-drag', '')
})

test('TB-18 a finger held still for 5 s keeps the drag; the lift then ends it normally', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB18still')
  const f0 = await rect(b)
  await dragTab(page, b, (f) => ({ x: f.x + 220, y: f.y + 140 }), {
    up: false,
  })
  await page.waitForTimeout(5200)
  await expect(page.locator('html')).toHaveAttribute('data-box-drag', '')
  await expect(page.locator('html')).toHaveAttribute('data-grip-drag', '')
  await expect(page.locator('[data-grid-ghost]')).toHaveCount(1)
  await page.mouse.up()
  await page.waitForTimeout(600)
  expect(away(await rect(b), f0)).toBeGreaterThan(60)
})

test('TB-18 a move with no button down (the lift was lost) ends the drag at the last preview; no tool stays stuck', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB18a')
  const f0 = await rect(b)
  const { end } = await dragTab(
    page,
    b,
    (f) => ({ x: f.x + 220, y: f.y + 140 }),
    { up: false },
  )
  await expect(page.locator('html')).toHaveAttribute('data-box-drag', '')
  await page.evaluate(({ x, y }) => {
    document.body.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 1,
        pointerType: 'mouse',
        buttons: 0,
        clientX: x,
        clientY: y,
        bubbles: true,
      }),
    )
  }, end)
  await expect(page.locator('html')).not.toHaveAttribute('data-box-drag', '', {
    timeout: 1500,
  })
  await expect(page.locator('html')).not.toHaveAttribute('data-grip-drag', '', {
    timeout: 1500,
  })
  await page.waitForTimeout(500)
  expect(away(await rect(b), f0)).toBeGreaterThan(60)
  await page.mouse.up()
  await tool(page, 'Pen').click()
  await expect(tool(page, 'Pen')).toHaveAttribute('aria-pressed', 'true')
})

test('TB-18 a lost pointer capture ends the drag within a second or two at the last preview', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB18b')
  const f0 = await rect(b)
  await dragTab(page, b, (f) => ({ x: f.x + 220, y: f.y + 140 }), {
    up: false,
  })
  // The browser tells the page the capture is gone (sent as the browser sends it).
  await grip(b).evaluate((g) => {
    g.dispatchEvent(
      new PointerEvent('lostpointercapture', { pointerId: 1, bubbles: true }),
    )
  })
  await expect(page.locator('html')).not.toHaveAttribute('data-box-drag', '', {
    timeout: 2500,
  })
  await page.waitForTimeout(500)
  expect(away(await rect(b), f0)).toBeGreaterThan(60)
  await page.mouse.up()
})

test.describe('switch OFF', () => {
  test.use({ hasTouch: false })
  test('the old border-strip drag still moves a box', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.removeItem('learning-notes:flags'),
    )
    await startInMode(page, 'computer')
    await page.goto('/')
    await createNotebook(page, 'Paper', 'Off')
    await typeInEditor(page, 'Main text')
    const a = await addBox(page, ['Alpha'])
    const b = await addBox(
      page,
      ['Beta gamma delta epsilon zeta eta theta iota kappa lambda'],
      0.3,
      280,
    )
    await pickBox(page, b)
    const f0 = await rect(b)
    const strip = await rect(b.locator('[data-box-band="top"]'))
    const band = {
      x: strip.x + strip.width * 0.3,
      y: strip.y + strip.height / 2,
    }
    await page.mouse.move(band.x, band.y)
    await page.mouse.down()
    await page.waitForTimeout(50)
    await page.mouse.move(band.x + 200, band.y + 150, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(600)
    expect(away(await rect(b), f0)).toBeGreaterThan(60)
    void a
  })
})

test('A phone has nothing to drag: no ≡ tab', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'touch')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Phone')
  await typeInEditor(page, 'Main text')
  const box = await addBox(page, ['Alpha'], 0.3, 40)
  const r = await rect(box)
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
  await expect(box).toHaveAttribute('data-picked', '')
  await expect(page.locator('[data-box-grip]')).toHaveCount(0)
})

test('The Pencil on the tab moves the box; no ink, no page scroll', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'PenMove')
  await tool(page, 'Pen').click()
  await pickBox(page, b)
  const f0 = await rect(b)
  const g = await centre(grip(b))
  const scroller = page.locator('[data-page-scroller]')
  const top0 = await scroller.evaluate((s) => s.scrollTop)
  await page.evaluate(async ({ x, y }) => {
    const target = document.elementFromPoint(x, y)!
    const ev = (name: string, dx: number, dy: number) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 9,
        isPrimary: true,
        clientX: x + dx,
        clientY: y + dy,
        button: 0,
        buttons: name === 'pointerup' ? 0 : 1,
        pressure: 0.4,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    const wait = (ms: number) =>
      new Promise<void>((done) => {
        const t0 = performance.now()
        const tick = () =>
          performance.now() - t0 >= ms ? done() : requestAnimationFrame(tick)
        tick()
      })
    target.dispatchEvent(ev('pointerdown', 0, 0))
    await wait(170)
    for (let i = 1; i <= 10; i++) {
      target.dispatchEvent(ev('pointermove', i * 12, i * 14))
      await wait(12)
    }
    target.dispatchEvent(ev('pointerup', 120, 140))
  }, g)
  await page.waitForTimeout(800)
  expect(away(await rect(b), f0)).toBeGreaterThan(60)
  expect(await scroller.evaluate((s) => s.scrollTop)).toBe(top0)
  expect((await savedInk(page)).strokes).toHaveLength(0)
})

test('A real Pencil (the browser own input as a pen: hover first, contact moves with the button down) holds, drags and drops the box; no ink', async ({
  page,
}) => {
  await installRealPen(page)
  const { b } = await twoBoxes(page, 'RealPen')
  await tool(page, 'Pen').click()
  await pickBox(page, b)
  const f0 = await rect(b)
  const g = await centre(grip(b))
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  // The hover a Pencil sends before it touches (no button).
  await page.mouse.move(g.x - 3, g.y - 6)
  await page.mouse.move(g.x, g.y)
  await page.mouse.down()
  await page.waitForTimeout(170)
  await page.mouse.move(g.x + 160, g.y + 150, { steps: 12 })
  // Still down and held still: the drag goes on.
  await page.waitForTimeout(1300)
  await expect(page.locator('html')).toHaveAttribute('data-box-drag', '')
  await page.mouse.up()
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
  await page.waitForTimeout(800)
  expect(away(await rect(b), f0)).toBeGreaterThan(60)
  expect((await savedInk(page)).strokes).toHaveLength(0)
})

test('TB-17 an Esc sent in the same moment as the last move still cancels the drag (the frame has not run yet)', async ({
  page,
}) => {
  const { b } = await twoBoxes(page, 'TB17quick')
  const f0 = await rect(b)
  const g = await centre(grip(b))
  await page.mouse.move(g.x, g.y)
  await page.mouse.down()
  await page.waitForTimeout(250)
  // The last move and the Esc arrive in one task: no animation frame between.
  await grip(b).evaluate(
    async (el, { x, y }) => {
      const ev = (type: string) =>
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: 'mouse',
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        })
      el.dispatchEvent(ev('pointermove'))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      el.dispatchEvent(ev('pointerup'))
    },
    { x: g.x + 220, y: g.y + 200 },
  )
  await page.mouse.up()
  await page.waitForTimeout(600)
  expect(away(await rect(b), f0)).toBeLessThan(3)
  await expect(page.getByText('Box moved')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-box-drag', '')
})
