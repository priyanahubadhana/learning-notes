// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  EXTRA,
  addBox,
  centre,
  drag,
  pick,
  rect,
  ring,
  start,
} from './cBoxesHelpers.ts'
import { installRealPen, realPenDrag, realPenHover } from './realPen.ts'

/**
 * C21 (owner's iPad, 16 Nov 2026, switch textbox.v2 ON): box move and resize
 * with the Apple Pencil. Hover never resizes or moves; a steady drag changes
 * the size steadily (no shake); shrinking works down to the text; the guide
 * line does not flicker; a box moves up into free space beside another box.
 * Every drag here is a real Pencil drag (e2e/realPen.ts): hover moves first,
 * then the touch.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

test.beforeEach(async ({ page }) => {
  await installRealPen(page)
})

const height = async (box: Locator) => (await rect(box)).height

/** A selected box with three lines, grown 220 px taller than its text with the mouse. */
async function tallBox(page: Page, name: string) {
  await start(page, name)
  const box = await addBox(page, ['One', 'Two', 'Three'])
  await pick(page, box)
  const s = await centre(ring(box, 's'))
  await drag(page, s, { x: s.x, y: s.y + 220 })
  await expect(box).toHaveAttribute('data-picked', '')
  return box
}

test('C21 a hovering Pencil over a dot never resizes the box', async ({
  page,
}) => {
  const box = await tallBox(page, 'C21a')
  const h0 = await height(box)
  for (const how of ['s', 'n', 'se', 'e']) {
    const p = await centre(ring(box, how))
    await realPenHover(page, [
      { x: p.x - 30, y: p.y - 30 },
      p,
      { x: p.x, y: p.y - 80 },
      { x: p.x + 10, y: p.y - 140 },
      p,
    ])
  }
  await page.waitForTimeout(300)
  expect(Math.abs((await height(box)) - h0)).toBeLessThan(1)
})

test('C21 a resize whose lift never arrives ends: the hover after it never resizes', async ({
  page,
}) => {
  const box = await tallBox(page, 'C21b')
  const s = await centre(ring(box, 's'))
  // The iPad sometimes loses the Pencil's lift (the capture is lost): the
  // page never hears the pointerup.
  await page.evaluate(() => {
    const eat = (e: Event) => {
      e.stopImmediatePropagation()
      window.removeEventListener('pointerup', eat, true)
    }
    window.addEventListener('pointerup', eat, true)
  })
  await realPenDrag(page, [s, { x: s.x, y: s.y - 20 }, { x: s.x, y: s.y - 40 }])
  await page.waitForTimeout(300)
  const h1 = await height(box)
  // The tip hovers back over the dot and up the page.
  const p = await centre(ring(box, 's'))
  await realPenHover(page, [
    p,
    { x: p.x, y: p.y - 60 },
    { x: p.x, y: p.y - 120 },
    { x: p.x, y: p.y + 40 },
  ])
  await page.waitForTimeout(300)
  expect(Math.abs((await height(box)) - h1)).toBeLessThan(1)
})

test('C21 shrinking with the Pencil is steady and reaches the text height', async ({
  page,
}) => {
  const box = await tallBox(page, 'C21c')
  const h0 = await height(box)
  const text = await rect(box.locator('[data-box-content]'))
  const s = await centre(ring(box, 's'))
  const path = [s]
  for (let i = 1; i <= 40; i++) path.push({ x: s.x, y: s.y - i * 8 })
  const seen: number[] = []
  await realPenDrag(page, path, {
    step: async () => {
      seen.push(await height(box))
    },
  })
  await page.waitForTimeout(400)
  // Never grows during a steady pull up (no shake).
  for (let i = 1; i < seen.length; i++)
    expect(seen[i], `step ${i}: ${seen.join(',')}`).toBeLessThanOrEqual(
      seen[i - 1] + 1,
    )
  const h1 = await height(box)
  expect(h1).toBeLessThan(h0 - 150)
  expect(h1).toBeGreaterThanOrEqual(text.height - 1)
  // Still selected, not typing: the dots are there for the next pull.
  await expect(box).toHaveAttribute('data-picked', '')
  await expect(box).not.toHaveAttribute('data-typing', '')
  await expect(ring(box, 's')).toBeVisible()
  // A steady pull down grows it steadily.
  const s1 = await centre(ring(box, 's'))
  const down = [s1]
  for (let i = 1; i <= 20; i++) down.push({ x: s1.x, y: s1.y + i * 8 })
  const grew: number[] = []
  await realPenDrag(page, down, {
    step: async () => {
      grew.push(await height(box))
    },
  })
  for (let i = 1; i < grew.length; i++)
    expect(grew[i], `step ${i}: ${grew.join(',')}`).toBeGreaterThanOrEqual(
      grew[i - 1] - 1,
    )
  // At the lift the box keeps its size: no jump back while the size is saved.
  expect(await height(box)).toBeGreaterThan(grew[grew.length - 1] - 2)
  await page.waitForTimeout(600)
  expect(await height(box)).toBeGreaterThan(h1 + 120)
})

test('C21 a steady Pencil drag of the top dot never shakes', async ({
  page,
}) => {
  const box = await tallBox(page, 'C21d')
  const n = await centre(ring(box, 'n'))
  const path = [n]
  for (let i = 1; i <= 20; i++) path.push({ x: n.x, y: n.y + i * 6 })
  const seen: number[] = []
  await realPenDrag(page, path, {
    step: async () => {
      seen.push(await height(box))
    },
  })
  for (let i = 1; i < seen.length; i++)
    expect(seen[i], `step ${i}: ${seen.join(',')}`).toBeLessThanOrEqual(
      seen[i - 1] + 1,
    )
  expect(seen[seen.length - 1]).toBeLessThan(seen[0] - 60)
})

/** A box on the right, and a box lower down on the left: room beside the right one. */
async function besideLayout(page: Page, name: string) {
  await start(page, name)
  const right = await addBox(page, ['Right 1', 'Right 2', 'Right 3'], 0.62, 60)
  const rr = await rect(right)
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const left = await addBox(
    page,
    ['Left 1'],
    0.12,
    rr.y + rr.height + 160 - (main.y + main.height),
  )
  void sheet
  const lr = await rect(left)
  expect(lr.x + lr.width).toBeLessThan(rr.x - 20)
  expect(lr.y).toBeGreaterThan(rr.y + rr.height + 100)
  return { right, left }
}

test('C21 a box moves up into free space beside another box, and stays there after a reload', async ({
  page,
}) => {
  const { right, left } = await besideLayout(page, 'C21e')
  const rr = await rect(right)
  const lr0 = await rect(left)
  await pick(page, left)
  const g = await centre(left.locator('[data-box-grip]'))
  const up = lr0.y - (rr.y + 10)
  const path = [g]
  for (let i = 1; i <= 12; i++) path.push({ x: g.x, y: g.y - (up * i) / 12 })
  await realPenDrag(page, path)
  await page.waitForTimeout(900)
  const lr1 = await rect(left)
  // Beside the right box (their tops within a few px of where it was put),
  // not pushed under it.
  expect(lr1.y).toBeLessThan(rr.y + rr.height)
  expect(Math.abs(lr1.y - (rr.y + 10))).toBeLessThan(14)
  expect(Math.abs((await rect(right)).y - rr.y)).toBeLessThan(2)
  await page.waitForTimeout(600)
  await page.reload()
  await page.waitForTimeout(1500)
  const boxes = page.locator(EXTRA)
  const ys = await Promise.all([0, 1].map(async (i) => rect(boxes.nth(i))))
  const l = ys.find((r) => r.x < rr.x - 20)!
  expect(Math.abs(l.y - lr1.y)).toBeLessThan(3)
})

test('C21 a box dropped where it would cover another box is not placed over it', async ({
  page,
}) => {
  const { right, left } = await besideLayout(page, 'C21f')
  const rr = await rect(right)
  await pick(page, left)
  const lr0 = await rect(left)
  const g = await centre(left.locator('[data-box-grip]'))
  // Straight over the right box.
  const dx = rr.x + 20 - lr0.x
  const dy = rr.y + 10 - lr0.y
  const path = [g]
  for (let i = 1; i <= 12; i++)
    path.push({ x: g.x + (dx * i) / 12, y: g.y + (dy * i) / 12 })
  await realPenDrag(page, path)
  await page.waitForTimeout(900)
  const [a, b] = [await rect(left), await rect(right)]
  const overlap =
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1
  expect(overlap).toBe(false)
})

test('C21 the guide line does not flicker during a slow steady move', async ({
  page,
}) => {
  const { right, left } = await besideLayout(page, 'C21g')
  const rr = await rect(right)
  await pick(page, left)
  const lr0 = await rect(left)
  const g = await centre(left.locator('[data-box-grip]'))
  // Move up slowly through the line where the left box's top meets the right
  // box's bottom (an alignment), with a hand's tremble (3 px on, 2 px back):
  // the line shows once and goes once, never on-off-on.
  const target = rr.y + rr.height
  const from = lr0.y - target - 24
  const path = [g]
  for (let i = 0; i <= 48; i++) {
    path.push({ x: g.x, y: g.y - from - i - 3 })
    path.push({ x: g.x, y: g.y - from - i - 1 })
  }
  const shown: boolean[] = []
  await realPenDrag(page, path, {
    step: async () => {
      shown.push((await page.locator('[data-smart-guides]').count()) > 0)
    },
  })
  const flips = shown.filter((v, i) => i > 0 && v !== shown[i - 1]).length
  expect(flips, shown.map((v) => (v ? 1 : 0)).join('')).toBeLessThanOrEqual(2)
  expect(shown.some(Boolean)).toBe(true)
})
