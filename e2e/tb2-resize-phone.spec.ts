// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { savedInk } from './inkHelpers.ts'

/**
 * Phase 2B, task 2B.5b (switch textbox.v2 ON): on a phone a selected box has
 * the same dots and rules as on the iPad (TB-20, TB-21, TB-22): n/s change the
 * height, e/w the width inside the single column (left-aligned), never below
 * the content, never under the box bar or the tab bar; a finger outside the
 * dots still scrolls the page.
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 3,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!
const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
const dot = (box: Locator, how: string) =>
  box.locator(`[data-resize-handle="${how}"]`)
const HOW = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

async function phoneBox(
  page: Page,
  name: string,
  lines: string[],
  o: { flag?: boolean; tall?: boolean } = {},
) {
  if (o.flag !== false)
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
    )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
  // A long page, so it can scroll.
  if (o.tall) for (let i = 0; i < 45; i++) await page.keyboard.press('Enter')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('[data-paper-sheet]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Add a box here' }).click()
  const box = page.locator(EXTRA).first()
  await expect(box.locator('.bn-editor')).toBeFocused()
  for (const [i, l] of lines.entries()) {
    if (i > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  // Select it: the first tap on a box selects it.
  const r = await rect(box)
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
  if (o.flag !== false) await expect(box).toHaveAttribute('data-picked', '')
  return box
}

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

test('phone: a selected box shows the 8 dots, 44 pt targets outside the box, on top', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P20', ['One', 'Two', 'Three'])
  const f = await rect(box)
  for (const how of HOW) {
    const r = await rect(dot(box, how))
    expect(r.width).toBeGreaterThanOrEqual(43.9)
    expect(r.height).toBeGreaterThanOrEqual(43.9)
    const cut =
      Math.min(r.x + r.width, f.x + f.width) > Math.max(r.x, f.x) + 0.5 &&
      Math.min(r.y + r.height, f.y + f.height) > Math.max(r.y, f.y) + 0.5
    expect(cut, `target ${how} reaches into the box`).toBe(false)
    const d = await rect(dot(box, how).locator('[data-handle-dot]'))
    expect(Math.abs(d.width - 10)).toBeLessThan(1)
    // The dot itself is what a finger on it reaches (not the bar, not the tab bar).
    const owner = await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.closest('[data-resize-handle]')
          ?.getAttribute('data-resize-handle') ?? null,
      { x: d.x + d.width / 2, y: d.y + d.height / 2 },
    )
    expect(owner, `dot ${how} is covered`).toBe(how)
  }
})

test('phone: n/s change the height live and the south dot never goes under the content', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P21h', ['Alpha beta', 'Gamma', 'Delta'])
  const f = await rect(box)
  const s = await centre(dot(box, 's'))
  await drag(page, s, { x: s.x, y: s.y + 90 }, { up: false })
  await page.waitForTimeout(120)
  expect((await rect(box)).height).toBeGreaterThan(f.height + 60)
  await page.mouse.up()
  await page.waitForTimeout(400)
  const content = await rect(box.locator('[data-box-content]'))
  const s2 = await centre(dot(box, 's'))
  await drag(page, s2, { x: s2.x, y: s2.y - 700 })
  expect((await rect(box)).height).toBeGreaterThanOrEqual(content.height - 1)
})

test('phone: e makes the box narrower, left-aligned, inside the column; never under its longest word', async ({
  page,
}) => {
  const word = 'Photosynthesis'
  const box = await phoneBox(page, 'P21w', ['Alpha ' + word, 'x'])
  // Wider first (up to the column), then narrower with the live check.
  const e0 = await centre(dot(box, 'e'))
  await drag(page, e0, { x: e0.x + 120, y: e0.y })
  const f = await rect(box)
  expect(f.width).toBeGreaterThan(200)
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: e.x - 60, y: e.y }, { up: false })
  await page.waitForTimeout(120)
  expect((await rect(box)).width).toBeLessThan(f.width - 30)
  await page.mouse.up()
  await page.waitForTimeout(500)
  const after = await rect(box)
  expect(Math.abs(after.x - f.x)).toBeLessThan(1)
  expect(after.x + after.width).toBeLessThanOrEqual(f.x + f.width + 0.5)
  // Far to the left: stops at the longest word.
  const e2 = await centre(dot(box, 'e'))
  await drag(page, e2, { x: 2, y: e2.y })
  const small = await rect(box)
  const clipped = await box
    .locator('[data-box-content]')
    .evaluate((c) => c.scrollWidth > c.clientWidth + 1)
  expect(clipped).toBe(false)
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
  expect(small.width).toBeGreaterThanOrEqual(wordW - 1)
  // And not much more: the word, the frame and the padding, plus 40 px.
  expect(small.width).toBeLessThanOrEqual(wordW + 70)
  // Far to the right: never wider than the column, never off the page.
  const e3 = await centre(dot(box, 'e'))
  await drag(page, e3, { x: 389, y: e3.y })
  const wide = await rect(box)
  expect(wide.x + wide.width).toBeLessThanOrEqual(389.5)
  expect(wide.width).toBeLessThanOrEqual(278)
})

test('phone: w changes the width too and the box stays left-aligned in the column', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P21w2', ['Alpha beta', 'Gamma'])
  const f = await rect(box)
  const w = await centre(dot(box, 'w'))
  await drag(page, w, { x: w.x + 70, y: w.y })
  const after = await rect(box)
  expect(after.width).toBeLessThan(f.width - 30)
  expect(Math.abs(after.x - f.x)).toBeLessThan(1)
})

test('phone: under 4 px or a lift before 120 ms changes nothing', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P-size', ['Alpha beta', 'Gamma'])
  const f = await rect(box)
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: e.x - 3, y: e.y })
  expect(Math.abs((await rect(box)).width - f.width)).toBeLessThan(1.5)
  await page.mouse.move(e.x, e.y)
  await page.mouse.down()
  await page.mouse.move(e.x - 100, e.y)
  await page.mouse.up()
  await page.waitForTimeout(400)
  expect(Math.abs((await rect(box)).width - f.width)).toBeLessThan(1.5)
})

test('phone: a Pencil drag on a dot resizes; no ink, no page scroll', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P22', ['Alpha beta', 'Gamma', 'Delta'])
  const f = await rect(box)
  const s = await centre(dot(box, 's'))
  const scroller = page.locator('[data-page-scroller]')
  const top0 = await scroller.evaluate((el) => el.scrollTop)
  await page.evaluate(async ({ x, y }) => {
    const target = document.elementFromPoint(x, y)!
    const ev = (name: string, dy: number) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 9,
        isPrimary: true,
        clientX: x,
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
    target.dispatchEvent(ev('pointerdown', 0))
    await wait(170)
    for (let i = 1; i <= 10; i++) {
      target.dispatchEvent(ev('pointermove', i * 8))
      await wait(12)
    }
    target.dispatchEvent(ev('pointerup', 80))
  }, s)
  await page.waitForTimeout(700)
  expect((await rect(box)).height).toBeGreaterThan(f.height + 50)
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(top0)
  expect((await savedInk(page)).strokes).toHaveLength(0)
})

test('phone: the size is kept after a reload', async ({ page }) => {
  const box = await phoneBox(page, 'P-keep', ['Alpha beta', 'Gamma'])
  const f = await rect(box)
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: e.x - 80, y: e.y })
  const w1 = (await rect(box)).width
  await page.reload()
  const again = page.locator(EXTRA).first()
  await expect(again).toBeVisible()
  expect(Math.abs((await rect(again)).width - w1)).toBeLessThan(1.5)
  expect(w1).toBeLessThan(f.width - 30)
})

test('phone: Undo puts the size back in one step', async ({ page }) => {
  const box = await phoneBox(page, 'P-undo', ['Alpha beta', 'Gamma'])
  const f = await rect(box)
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: e.x - 70, y: e.y })
  expect((await rect(box)).width).toBeLessThan(f.width - 30)
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(async () => Math.abs((await rect(box)).width - f.width))
    .toBeLessThan(1.5)
})

test('phone: where two targets meet the nearest dot wins (the corner, not the side)', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P-near', ['Hi'])
  const f = await rect(box)
  const at = { x: f.x + f.width + 10, y: f.y + f.height + 2 }
  await drag(page, at, { x: at.x, y: at.y + 50 })
  expect((await rect(box)).height).toBeGreaterThan(f.height + 20)
})

test('phone: the height is kept after a reload', async ({ page }) => {
  const box = await phoneBox(page, 'P-keeph', ['Alpha beta'])
  const f = await rect(box)
  const s = await centre(dot(box, 's'))
  await drag(page, s, { x: s.x, y: s.y + 90 })
  const h1 = (await rect(box)).height
  expect(h1).toBeGreaterThan(f.height + 60)
  await page.reload()
  const again = page.locator(EXTRA).first()
  await expect(again).toBeVisible()
  expect(Math.abs((await rect(again)).height - h1)).toBeLessThan(1.5)
})

test('phone: a box that was never resized fills the column, even if it is narrower on the iPad', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P-fill', ['Alpha beta'])
  const col = await page.evaluate(() => {
    const m = document.querySelector('[data-paper]')!.getBoundingClientRect()
    return m.width
  })
  expect((await rect(box)).width).toBeGreaterThan(col * 0.8)
  // Narrower here, then the iPad width is untouched: after a reload it is still narrow.
  const e = await centre(dot(box, 'e'))
  await drag(page, e, { x: e.x - 90, y: e.y })
  const narrow = (await rect(box)).width
  await page.reload()
  expect(
    Math.abs((await rect(page.locator(EXTRA).first())).width - narrow),
  ).toBeLessThan(1.5)
})

test('phone: a finger on the page outside the dots still scrolls it', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P-scroll', ['Alpha beta'], { tall: true })
  const f = await rect(box)
  const scroller = page.locator('[data-page-scroller]')
  const top0 = await scroller.evaluate((el) => el.scrollTop)
  await page.mouse.move(380, 300)
  await page.mouse.wheel(0, -200)
  await page.waitForTimeout(500)
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeLessThan(top0)
  const g = await rect(box)
  expect(Math.abs(g.width - f.width)).toBeLessThan(1.5)
})

test('phone: with the switch OFF there are no dots', async ({ page }) => {
  const box = await phoneBox(page, 'P-off', ['Alpha beta'], { flag: false })
  await expect(box).toBeVisible()
  await expect(page.locator('[data-resize-handle]')).toHaveCount(0)
})
