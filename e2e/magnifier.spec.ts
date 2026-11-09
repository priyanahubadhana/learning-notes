// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkClientBox,
  inkNote,
  line,
  painted,
  savedInk,
  stroke,
} from './inkHelpers.ts'
import { option, tool } from './mainBarHelpers.ts'

/**
 * The Magnifier after the owner's iPad pass (7 Nov): the pad's ink sits
 * under the pen, a pad stroke lands only in the target box (never under the
 * pad), page and pad show the same ink at once (erasing on either side
 * clears both), the pad is big and its top edge resizes it, and a hint
 * explains it the first time. Simulated pointer events; Chromium and the
 * iPad stand-in.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

async function openMagnifier(page: Page) {
  await inkNote(page, 'Pen')
  await tool(page, 'Insert').click()
  await option(page, 'Magnifier').click()
  const padEl = page.locator('[data-magnifier-pad]')
  await expect(padEl).toBeVisible()
  await expect(page.locator('[data-magnifier-target]')).toBeVisible()
  // The Insert pill closes (the page moves up a little); let it settle.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  // Pad coordinates are the pad canvas's (inside its 1 px border).
  return (await padEl.locator('canvas').boundingBox())!
}

/** The painted box of the pad's canvas, in pad px (CSS px). */
const padPainted = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      '[data-magnifier-pad] canvas',
    )!
    const { width, height } = c
    const data = c.getContext('2d')!.getImageData(0, 0, width, height).data
    let x0 = width
    let y0 = height
    let x1 = -1
    let y1 = -1
    let n = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 8) {
          n++
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    const dpr = c.width / c.clientWidth
    return x1 < 0
      ? null
      : { x0: x0 / dpr, y0: y0 / dpr, x1: x1 / dpr, y1: y1 / dpr, n }
  })

/** The painted box of the page's ink canvas, in client px. */
const pagePainted = (page: Page) => inkClientBox(page)

test('the pad is a third of the screen, shows a hint until the first stroke, and its top edge resizes it', async ({
  page,
}) => {
  const pad = await openMagnifier(page)
  const group = (await page.locator('[data-magnifier]').boundingBox())!
  expect(group.height / 1000).toBeGreaterThan(0.27)
  expect(group.height / 1000).toBeLessThan(0.33)
  await expect(page.locator('[data-magnifier-hint]')).toBeVisible()
  await stroke(page, line([pad.x + 20, pad.y + 60], [pad.x + 120, pad.y + 60]))
  await expect(page.locator('[data-magnifier-hint]')).toHaveCount(0)
  // Drag the top edge up: taller.
  const edge = (await page.locator('[data-magnifier-resize]').boundingBox())!
  await stroke(
    page,
    line(
      [edge.x + edge.width / 2, edge.y + edge.height / 2],
      [edge.x + edge.width / 2, edge.y - 150],
      8,
    ),
    { type: 'touch' },
  )
  const taller = (await page.locator('[data-magnifier]').boundingBox())!
  expect(taller.height).toBeGreaterThan(group.height + 100)
  expect(taller.height / 1000).toBeLessThanOrEqual(0.5)
})

test('the pad ink sits under the pen (within a pixel) and lands only in the target box', async ({
  page,
}) => {
  const pad = await openMagnifier(page)
  const y = 60
  await stroke(page, line([pad.x + 20, pad.y + y], [pad.x + 220, pad.y + y]))
  const [s] = await expectStrokes(page, 1)
  const drawn = (await padPainted(page))!
  // A 3 px line centred on y: the painted rows straddle it.
  expect((drawn.y0 + drawn.y1) / 2).toBeGreaterThan(y - 1)
  expect((drawn.y0 + drawn.y1) / 2).toBeLessThan(y + 1)
  expect(drawn.x0).toBeGreaterThan(20 - 3)
  expect(drawn.x0).toBeLessThan(20 + 1)
  expect(drawn.x1).toBeGreaterThan(220 - 2.5)
  expect(drawn.x1).toBeLessThan(220 + 3)
  // On the page the stroke is inside the target box, not under the pad.
  const target = (await page.locator('[data-magnifier-target]').boundingBox())!
  const onPage = (await pagePainted(page))!
  expect(onPage.x0).toBeGreaterThanOrEqual(target.x - 3)
  expect(onPage.x1).toBeLessThanOrEqual(target.x + target.width + 3)
  expect(onPage.y0).toBeGreaterThanOrEqual(target.y - 3)
  expect(onPage.y1).toBeLessThanOrEqual(target.y + target.height + 3)
  expect(onPage.y1).toBeLessThan(pad.y)
  // 200 px in the pad at 2.5x is 80 px on the page.
  const xs = s.pts.filter((_, i) => i % 6 === 0)
  const landed = (Math.max(...xs) - Math.min(...xs)) * s.bw
  expect(landed).toBeGreaterThan(70)
  expect(landed).toBeLessThan(90)
})

test('erasing on the page clears the pad at once; erasing in the pad clears the page', async ({
  page,
}) => {
  const pad = await openMagnifier(page)
  await stroke(page, line([pad.x + 20, pad.y + 60], [pad.x + 220, pad.y + 60]))
  await expectStrokes(page, 1)
  await expect
    .poll(() => padPainted(page).then((b) => b?.n ?? 0))
    .toBeGreaterThan(100)
  // The Eraser on the page, across the writing in the target box.
  await tool(page, 'Eraser').click({ force: true })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500) // the pill closed; the page settled
  const onPage = (await pagePainted(page))!
  const my = (onPage.y0 + onPage.y1) / 2
  await stroke(page, line([onPage.x0 - 6, my], [onPage.x1 + 6, my], 30), {
    id: 12,
  })
  await expectStrokes(page, 0)
  await expect.poll(() => padPainted(page).then((b) => b?.n ?? 0)).toBe(0)
  await expect.poll(() => painted(page, 'ink')).toBe(0)

  // Write again, then rub it out inside the pad.
  await tool(page, 'Pen').click({ force: true })
  await page.keyboard.press('Escape')
  await stroke(page, line([pad.x + 20, pad.y + 60], [pad.x + 220, pad.y + 60]))
  await expectStrokes(page, 1)
  await tool(page, 'Eraser').click({ force: true })
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-magnifier-hint]')).toBeVisible() // "rub here"
  await stroke(
    page,
    line([pad.x + 10, pad.y + 60], [pad.x + 240, pad.y + 60], 40),
    { id: 13 },
  )
  await expectStrokes(page, 0)
  await expect.poll(() => painted(page, 'ink')).toBe(0)
  await expect.poll(() => padPainted(page).then((b) => b?.n ?? 0)).toBe(0)
  expect((await savedInk(page)).strokes).toHaveLength(0)
})

test('the box moves on when the pen lifts in the pad right fifth, and drags by its label', async ({
  page,
}) => {
  const pad = await openMagnifier(page)
  const before = (await page.locator('[data-magnifier-target]').boundingBox())!
  await stroke(
    page,
    line(
      [pad.x + pad.width * 0.6, pad.y + 60],
      [pad.x + pad.width * 0.9, pad.y + 60],
    ),
  )
  await expectStrokes(page, 1)
  const after = (await page.locator('[data-magnifier-target]').boundingBox())!
  // Moved on by 60 % of its width, or (no room on this line) to the next line.
  const movedOn =
    after.x - before.x > before.width * 0.5 ||
    after.y - before.y > before.height * 0.5
  expect(movedOn).toBe(true)
  // The label drags the box.
  const label = (await page.locator('[data-magnifier-handle]').boundingBox())!
  await stroke(
    page,
    line(
      [label.x + 10, label.y + label.height / 2],
      [label.x + 10, label.y + label.height / 2 + 120],
      8,
    ),
    { type: 'touch' },
  )
  const moved = (await page.locator('[data-magnifier-target]').boundingBox())!
  expect(moved.y - after.y).toBeGreaterThan(100)
})
