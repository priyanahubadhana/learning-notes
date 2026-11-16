// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { savedInk } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Phase 2B, task 2B.5 (switch textbox.v2 ON): TB-20 the nearest dot wins and
 * zones never overlap; TB-21 a dot resizes live, never below the content;
 * TB-22 the Pencil on a dot never inks or scrolls; TB-23 a column divider
 * resizes both boxes live. Sizes: 44 pt, 120 ms hold, 4 px dead zone.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!
const HOW = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

async function start(page: Page, name: string) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
}

/** A box with these lines, left unselected; `down` px under the main text. */
async function addBox(page: Page, lines: string[], fx = 0.3, down = 60) {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
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

async function oneBox(page: Page, name: string, lines: string[]) {
  await start(page, name)
  await typeInEditor(page, 'Main text')
  const box = await addBox(page, lines)
  await pickBox(page, box)
  return box
}

const dot = (box: Locator, how: string) =>
  box.locator(`[data-resize-handle="${how}"]`)
const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}

/** A mouse drag from `from` to `to`, held `hold` ms before the first move. */
async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  o: { hold?: number; up?: boolean } = {},
) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(o.hold ?? 160)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  if (o.up !== false) {
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
}

test('TB-20 every dot has a 44 pt target that lies outside the text', async ({
  page,
}) => {
  const box = await oneBox(page, 'TB20a', ['One', 'Two', 'Three'])
  const f = await rect(box)
  for (const how of HOW) {
    const r = await rect(dot(box, how))
    expect(r.width).toBeGreaterThanOrEqual(43.9)
    expect(r.height).toBeGreaterThanOrEqual(43.9)
    const cut =
      Math.min(r.x + r.width, f.x + f.width) > Math.max(r.x, f.x) + 0.5 &&
      Math.min(r.y + r.height, f.y + f.height) > Math.max(r.y, f.y) + 0.5
    expect(cut, `target ${how} reaches into the box`).toBe(false)
    // The dot is a 10 px ring drawn on the edge.
    const d = await rect(dot(box, how).locator('[data-handle-dot]'))
    expect(Math.abs(d.width - 10)).toBeLessThan(1)
  }
})

test('TB-20 a press on the first or last text row puts the cursor there; it does not resize', async ({
  page,
}) => {
  const box = await oneBox(page, 'TB20b', ['First row', 'Middle', 'Last row'])
  const before = await rect(box)
  // The middle of the first and of the last text line (rows touch the edges).
  const lines = await box.locator('.bn-inline-content').evaluate((el) => {
    const r = document.createRange()
    r.selectNodeContents(el)
    return [...r.getClientRects()]
      .filter((q) => q.width > 2)
      .map((q) => ({ x: q.x, y: q.y + q.height / 2 }))
  })
  for (const row of [0, lines.length - 1]) {
    const x = lines[row].x + 12
    const y = lines[row].y
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.waitForTimeout(160)
    await page.mouse.move(x, y + (row === 0 ? 30 : -30), { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    const after = await rect(box)
    expect(Math.abs(after.height - before.height)).toBeLessThan(2)
    expect(Math.abs(after.y - before.y)).toBeLessThan(2)
  }
  await expect(box.locator('.bn-editor')).toBeFocused()
})

test('TB-20 where two targets meet the nearest dot wins (the corner, not the side)', async ({
  page,
}) => {
  const box = await oneBox(page, 'TB20c', ['Hi'])
  const f = await rect(box)
  // Just right of the bottom edge: the east and the south-east targets both
  // hold this point, the south-east dot is the nearer one.
  const at = { x: f.x + f.width + 10, y: f.y + f.height + 2 }
  await drag(page, at, { x: at.x, y: at.y + 50 })
  expect((await rect(box)).height).toBeGreaterThan(f.height + 20)
})

test('TB-21 the east and south dots resize the box live', async ({ page }) => {
  const box = await oneBox(page, 'TB21a', ['Alpha beta', 'Gamma', 'Delta'])
  const f = await rect(box)
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: e.x + 140, y: e.y }, { up: false })
  // Live: the box is already wider before the finger lifts (it needs a frame
  // to draw; the old inflated minimum hid that).
  await expect
    .poll(async () => (await rect(box)).width)
    .toBeGreaterThan(f.width + 100)
  await page.mouse.up()
  await page.waitForTimeout(500)
  expect((await rect(box)).width).toBeGreaterThan(f.width + 100)
  const s = await centre(dot(box, 's'))
  await drag(page, s, { x: s.x, y: s.y + 90 }, { up: false })
  await page.waitForTimeout(120)
  expect((await rect(box)).height).toBeGreaterThan(f.height + 60)
  await page.mouse.up()
})

test('TB-21 never smaller than its text: the longest word and every line stay', async ({
  page,
}) => {
  const word = 'Supercalifragilisticexpialidocious'
  const box = await oneBox(page, 'TB21b', [word + ' and more', 'x', 'y', 'z'])
  const f = await rect(box)
  const wordW = await box.evaluate((el, w) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const i = (n.textContent ?? '').indexOf(w)
      if (i < 0) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + w.length)
      return r.getBoundingClientRect().width
    }
    return 0
  }, word)
  expect(wordW).toBeGreaterThan(100)
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: f.x - 300, y: e.y })
  expect((await rect(box)).width).toBeGreaterThanOrEqual(wordW - 1)
  // And not much more: the word, the frame and the padding, plus 40 px.
  expect((await rect(box)).width).toBeLessThanOrEqual(wordW + 70)
  const clipped = await box
    .locator('[data-box-content]')
    .evaluate((c) => c.scrollWidth > c.clientWidth + 1)
  expect(clipped).toBe(false)
  const s = await centre(dot(box, 's'))
  const content = await rect(box.locator('[data-box-content]'))
  await drag(page, s, { x: s.x, y: s.y - 600 })
  expect((await rect(box)).height).toBeGreaterThanOrEqual(content.height - 1)
})

test('Sizes: under 4 px or a lift before 120 ms changes nothing; the dot grows after the hold', async ({
  page,
}) => {
  const box = await oneBox(page, 'TB21c', ['Alpha beta', 'Gamma', 'Delta'])
  const f = await rect(box)
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: e.x + 3, y: e.y })
  expect(Math.abs((await rect(box)).width - f.width)).toBeLessThan(1.5)
  // A flick that lifts inside 120 ms.
  await page.mouse.move(e.x, e.y)
  await page.mouse.down()
  await page.mouse.move(e.x + 120, e.y)
  await page.mouse.up()
  await page.waitForTimeout(400)
  expect(Math.abs((await rect(box)).width - f.width)).toBeLessThan(1.5)
  // Held: the dot grows, then the drag counts.
  await page.mouse.move(e.x, e.y)
  await page.mouse.down()
  await page.waitForTimeout(200)
  await expect(dot(box, 'e')).toHaveAttribute('data-held', '')
  await page.mouse.move(e.x + 80, e.y, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  expect((await rect(box)).width).toBeGreaterThan(f.width + 60)
  await expect(dot(box, 'e')).not.toHaveAttribute('data-held', '')
})

test('TB-22 a Pencil drag on a dot resizes; no ink, no page scroll', async ({
  page,
}) => {
  const box = await oneBox(page, 'TB22', ['Alpha beta', 'Gamma', 'Delta'])
  await tool(page, 'Pen').click()
  await pickBox(page, box)
  const f = await rect(box)
  const e = await centre(dot(box, 'e'))
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
      target.dispatchEvent(ev('pointermove', i * 10, i * 8))
      await wait(12)
    }
    target.dispatchEvent(ev('pointerup', 100, 80))
  }, e)
  await page.waitForTimeout(700)
  expect((await rect(box)).width).toBeGreaterThan(f.width + 60)
  expect(await scroller.evaluate((s) => s.scrollTop)).toBe(top0)
  expect((await savedInk(page)).strokes).toHaveLength(0)
})

test('TB-23 a column divider resizes both boxes live; under 4 px is a tap', async ({
  page,
}) => {
  await start(page, 'TB23')
  await typeInEditor(page, 'Main text')
  const a = await addBox(page, ['Left box'], 0.3, 60)
  const b = await addBox(page, ['Right box'], 0.3, 170)
  await pickBox(page, b)
  const g = await rect(b.locator('[data-box-grip]'))
  const t = await rect(a)
  // Since 2B.7 the ≡ tab lifts the box only after a 120 ms hold (drag holds 160).
  await drag(
    page,
    { x: g.x + g.width / 2, y: g.y + g.height / 2 },
    { x: t.x + t.width * 0.9, y: t.y + t.height * 0.5 },
  )
  const div = page.locator('[data-grid-divider]').first()
  await expect(div).toBeVisible()
  const d = await centre(div)
  const wa0 = (await rect(a)).width
  const wb0 = (await rect(b)).width
  await page.mouse.move(d.x, d.y)
  await page.mouse.down()
  await page.mouse.move(d.x + 2, d.y)
  await page.mouse.up()
  await page.waitForTimeout(600)
  expect(Math.abs((await rect(a)).width - wa0)).toBeLessThan(1.5)
  const d2 = await centre(div)
  await page.mouse.move(d2.x, d2.y)
  await page.mouse.down()
  await page.waitForTimeout(160)
  await page.mouse.move(d2.x + 90, d2.y, { steps: 8 })
  // Live: both have changed before the lift (the button is still down).
  // Why a poll: the press lands on the right box's left dot, which lies over
  // the divider, and since C21 a dot resize draws once per frame; a frame can
  // take 150 ms on a slow runner, so a fixed 120 ms wait missed it.
  await expect
    .poll(async () => (await rect(a)).width, { timeout: 3000 })
    .toBeGreaterThan(wa0 + 40)
  await expect
    .poll(async () => (await rect(b)).width, { timeout: 3000 })
    .toBeLessThan(wb0 - 40)
  await page.mouse.up()
})

test('lines of a narrow box never overlap and never touch the frame', async ({
  page,
}) => {
  const box = await oneBox(page, 'Lines', ['Photosynthesis light water carbon'])
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: e.x - 400, y: e.y })
  const f = await rect(box)
  const rows = await box.locator('.bn-inline-content').evaluate((el) => {
    const tops: number[] = []
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const r = document.createRange()
      r.selectNodeContents(n)
      for (const q of r.getClientRects())
        if (q.width > 2 && !tops.some((t) => Math.abs(t - q.top) < 3))
          tops.push(q.top)
    }
    const left = Math.min(
      ...[...el.querySelectorAll('*'), el].flatMap((n) =>
        n.children.length ? [] : [n.getBoundingClientRect().left],
      ),
    )
    return {
      tops: tops.sort((a, b) => a - b),
      font: parseFloat(getComputedStyle(el).fontSize),
      left,
    }
  })
  expect(rows.tops.length).toBeGreaterThan(1)
  // The line step is at least 1.2 x the type size.
  for (let i = 1; i < rows.tops.length; i++)
    expect(rows.tops[i] - rows.tops[i - 1]).toBeGreaterThanOrEqual(
      rows.font * 1.2 - 0.5,
    )
  expect(rows.tops[0]).toBeGreaterThanOrEqual(f.y + 2)
  // The text starts clear of the west dot (it sits on the edge).
  expect(rows.left).toBeGreaterThanOrEqual(f.x + 8)
})

test('a Pencil slip on a divider (lifted inside 120 ms) does not resize', async ({
  page,
}) => {
  await start(page, 'TB23pen')
  await typeInEditor(page, 'Main text')
  const a = await addBox(page, ['Left box'], 0.3, 60)
  const b = await addBox(page, ['Right box'], 0.3, 170)
  await pickBox(page, b)
  const g = await rect(b.locator('[data-box-grip]'))
  const t = await rect(a)
  // Since 2B.7 the ≡ tab lifts the box only after a 120 ms hold (drag holds 160).
  await drag(
    page,
    { x: g.x + g.width / 2, y: g.y + g.height / 2 },
    { x: t.x + t.width * 0.9, y: t.y + t.height * 0.5 },
  )
  await expect(page.locator('[data-grid-divider]').first()).toBeVisible()
  const d = await centre(page.locator('[data-grid-divider]').first())
  const wa0 = (await rect(a)).width
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)!
    const ev = (n: string, dx: number) =>
      new PointerEvent(n, {
        pointerType: 'pen',
        pointerId: 5,
        isPrimary: true,
        clientX: x + dx,
        clientY: y,
        button: 0,
        buttons: n === 'pointerup' ? 0 : 1,
        bubbles: true,
        cancelable: true,
      })
    el.dispatchEvent(ev('pointerdown', 0))
    el.dispatchEvent(ev('pointermove', 90))
    el.dispatchEvent(ev('pointerup', 90))
  }, d)
  await page.waitForTimeout(500)
  expect(Math.abs((await rect(a)).width - wa0)).toBeLessThan(1.5)
})

test('TB-21 a column never gets narrower than its longest word', async ({
  page,
}) => {
  await start(page, 'TB21col')
  await typeInEditor(page, 'Main text')
  const word = 'Supercalifragilisticexpialidocious'
  const a = await addBox(page, [word], 0.3, 60)
  const b = await addBox(page, ['Right box'], 0.3, 170)
  await pickBox(page, b)
  const g = await rect(b.locator('[data-box-grip]'))
  const t = await rect(a)
  // Since 2B.7 the ≡ tab lifts the box only after a 120 ms hold (drag holds 160).
  await drag(
    page,
    { x: g.x + g.width / 2, y: g.y + g.height / 2 },
    { x: t.x + t.width * 0.9, y: t.y + t.height * 0.5 },
  )
  await expect(page.locator('[data-grid-divider]').first()).toBeVisible()
  const wordW = await a.evaluate((el, w) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const i = (n.textContent ?? '').indexOf(w)
      if (i < 0) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + w.length)
      return r.getBoundingClientRect().width
    }
    return 0
  }, word)
  expect(wordW).toBeGreaterThan(100)
  const d = await centre(page.locator('[data-grid-divider]').first())
  await drag(page, d, { x: d.x - 600, y: d.y })
  const after = await rect(a)
  expect(after.width).toBeGreaterThanOrEqual(wordW - 1)
  const clipped = await a
    .locator('[data-box-content]')
    .evaluate((c) => c.scrollWidth > c.clientWidth + 1)
  expect(clipped).toBe(false)
  // The word is not broken: one line of text.
  const lines = await a.locator('.bn-inline-content').evaluate((el) => {
    const tops: number[] = []
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const r = document.createRange()
      r.selectNodeContents(n)
      for (const q of r.getClientRects())
        if (q.width > 2 && !tops.some((t) => Math.abs(t - q.top) < 3))
          tops.push(q.top)
    }
    return tops.length
  })
  expect(lines).toBe(1)
})

test('TB-21 upper limit: a short text narrows to its longest word, not to a larger minimum', async ({
  page,
}) => {
  // Why: the editor's <style> text was counted as a word, so every minimum
  // was about 137 mm; all other checks are lower limits and missed it.
  const box = await oneBox(page, 'TB21up', ['Alpha beta', 'Gamma'])
  const wordW = await box.evaluate((el) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const i = (n.textContent ?? '').indexOf('Alpha')
      if (i < 0) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + 5)
      return r.getBoundingClientRect().width
    }
    return 0
  })
  expect(wordW).toBeGreaterThan(20)
  const f = await rect(box)
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: f.x - 300, y: e.y })
  const w = (await rect(box)).width
  expect(w).toBeGreaterThanOrEqual(wordW - 1)
  expect(w).toBeLessThanOrEqual(wordW + 70)
})
