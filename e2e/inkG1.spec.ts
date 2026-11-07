import { expect, test } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  painted,
  savedInk,
  stroke,
  textBox,
  wave,
} from './inkHelpers.ts'
import { card, option, pill, tool } from './mainBarHelpers.ts'

/**
 * Shapes, Tape, Ruler and Magnifier (G1): simulated pen events on the
 * drawing pad, like the other ink specs.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const xs = (pts: number[]) => pts.filter((_, i) => i % 6 === 0)
const ys = (pts: number[]) => pts.filter((_, i) => i % 6 === 1)
const spread = (a: number[]) => Math.max(...a) - Math.min(...a)

test('a chosen shape is drawn by dragging from corner to corner', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'pencil', { 'ink.pen': { drawAs: 'rect' } })
  const box = await textBox(page)
  await stroke(page, line([box.x + 20, box.y + 60], [box.x + 220, box.y + 160]))
  const [s] = await expectStrokes(page, 1)
  expect(s.shape).toBe('rect')
  expect(s.kind).toBe('ink')
  // Four corners and the closing point.
  expect(s.pts.length / 6).toBe(5)
  expect(spread(xs(s.pts))).toBeGreaterThan(0.1)
  expect(spread(ys(s.pts))).toBeGreaterThan(0.05)
})

test('Draw as in the Pen card changes what a drag draws', async ({ page }) => {
  await inkNote(page, 'Pen')
  if (!(await pill(page).isVisible())) await tool(page, 'Pen').click()
  await option(page, /^Pen type/)
    .first()
    .click()
  await card(page).getByRole('radio', { name: 'Oval' }).click()
  await page.keyboard.press('Escape')
  const box = await textBox(page)
  await stroke(page, line([box.x + 40, box.y + 60], [box.x + 240, box.y + 140]))
  const [s] = await expectStrokes(page, 1)
  expect(s.shape).toBe('ellipse')
})

test('Tape is a solid box; a tap peels it off and a second tap sticks it back', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'pencil', { 'ink.pen': { drawAs: 'tape' } })
  const box = await textBox(page)
  const a: [number, number] = [box.x + 10, box.y + 4]
  const b: [number, number] = [box.x + 260, box.y + 40]
  await stroke(page, line(a, b))
  const [tape] = await expectStrokes(page, 1)
  expect(tape.kind).toBe('tape')
  expect(tape.fill).toBe(true)
  const stuck = await painted(page, 'ink')
  expect(stuck).toBeGreaterThan(2000)

  // A tap on it peels it: nothing new is saved and the box is not painted.
  const middle: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  await stroke(page, [middle])
  await expect.poll(() => painted(page, 'ink')).toBeLessThan(stuck / 4)
  expect((await savedInk(page)).strokes).toHaveLength(1)
  // Again: it is stuck back.
  await stroke(page, [middle])
  await expect.poll(() => painted(page, 'ink')).toBeGreaterThan(stuck / 2)
  expect((await savedInk(page)).strokes).toHaveLength(1)
})

test('the Eraser takes a whole tape off with one touch inside it', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'pencil', { 'ink.pen': { drawAs: 'tape' } })
  const box = await textBox(page)
  const a: [number, number] = [box.x + 10, box.y + 4]
  const b: [number, number] = [box.x + 260, box.y + 60]
  await stroke(page, line(a, b))
  await expectStrokes(page, 1)
  await tool(page, 'Eraser').click({ force: true })
  await stroke(page, line([a[0] + 100, a[1] + 20], [a[0] + 104, a[1] + 24], 4))
  await expectStrokes(page, 0)
})

test('the Ruler makes a pen line along its edge straight', async ({ page }) => {
  await inkNote(page, 'Pen')
  await tool(page, 'Insert').click()
  await option(page, 'Ruler').click()
  const centre = page.locator('[data-ruler-handle="move"]')
  await expect(centre).toBeVisible()
  const c = (await centre.boundingBox())!
  const cy = c.y + c.height / 2
  const x0 = c.x + c.width / 2 - 120
  // Start just under the lower edge (40 px under the middle) and wobble.
  await tool(page, 'Pen').click({ force: true })
  await stroke(page, wave(x0, x0 + 240, cy + 48, 14))
  const [s] = await expectStrokes(page, 1)
  // Straight: every point at the same height.
  expect(spread(ys(s.pts))).toBeLessThan(0.002)
  expect(spread(xs(s.pts))).toBeGreaterThan(0.1)

  // Far from the ruler the pen is free.
  await stroke(page, wave(x0, x0 + 240, cy + 48 + 120, 14))
  const all = await expectStrokes(page, 2)
  const free = all.find((x) => x.id !== s.id)!
  expect(spread(ys(free.pts))).toBeGreaterThan(0.01)
})

test('the Magnifier pad: big writing lands small in the target box', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await tool(page, 'Insert').click()
  await option(page, 'Magnifier').click()
  const padEl = page.locator('[data-magnifier-pad]')
  await expect(padEl).toBeVisible()
  await expect(page.locator('[data-magnifier-target]')).toBeVisible()
  const pad = (await padEl.boundingBox())!
  await stroke(
    page,
    line([pad.x + 20, pad.y + 50], [pad.x + 200, pad.y + 50], 12),
    { type: 'mouse' },
  )
  const [s] = await expectStrokes(page, 1)
  // 180 px in the pad at 2.5x is about 72 px on the page.
  const wrapWidth = s.bw
  const landed = spread(xs(s.pts)) * wrapWidth
  expect(landed).toBeGreaterThan(62)
  expect(landed).toBeLessThan(82)
  // The pen's line is thinner too.
  expect(s.style.width).toBeLessThan(2)
})
