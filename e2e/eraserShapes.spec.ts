// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  savedInk,
  stroke,
  textBox,
} from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { installRealPen, realPen } from './realPen.ts'

/**
 * C2 (owner test 16 Nov): Standard and Precise on a drawn shape. The tip
 * cuts only what it touches, the rest stays exactly where it was (before, the
 * oval vanished and the rectangle bent into a slant). One Undo brings the
 * original shape back. The eraser is a real Pencil press (realPen.ts).
 */
test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

/** A path for the real Pencil helper (it wants {x, y}). */
const pen = (pts: [number, number][]) => pts.map(([x, y]) => ({ x, y }))
const STEP = 6
const px = (pts: number[], c: number) => pts.filter((_, i) => i % STEP === c)
const bounds = (pts: number[]) => {
  const x = px(pts, 0)
  const y = px(pts, 1)
  return {
    x0: Math.min(...x),
    x1: Math.max(...x),
    y0: Math.min(...y),
    y1: Math.max(...y),
  }
}

/** Remembers every painted ink pixel (alpha) of the page, to compare after the cut. */
const snapshot = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __snap: unknown[] }
    w.__snap = [
      ...document.querySelectorAll<HTMLCanvasElement>(
        '[data-ink-canvas="ink"]',
      ),
    ]
      .filter((c) => c.width > 0 && c.height > 0)
      .map((c) => {
        const r = c.getBoundingClientRect()
        return {
          c,
          left: r.left,
          top: r.top,
          k: c.width / r.width,
          alpha: Uint8Array.from(
            c
              .getContext('2d')!
              .getImageData(0, 0, c.width, c.height)
              .data.filter((_, i) => i % 4 === 3),
          ),
        }
      })
  })

/**
 * Pixels that changed, counting only alpha steps above 24 (anti-aliasing noise
 * is smaller): outside a circle of `r` css px around the cut, and inside it.
 */
const changed = (
  page: Page,
  cut: { x: number; y: number },
  r: number,
  /**
   * owner, 25 Nov: pixels within 2 css px (a 5 x 5 square) of these points are not counted.
   * Only the anti-aliased tip of a rectangle corner is skipped; CI showed its alpha changing
   * exactly there. The same on every machine.
   */
  skip: { x: number; y: number }[] = [],
) =>
  page.evaluate(
    ({ cut, r, skip }) => {
      type Tile = {
        c: HTMLCanvasElement
        left: number
        top: number
        k: number
        alpha: Uint8Array
      }
      const snap = (window as unknown as { __snap: Tile[] }).__snap
      let outside = 0
      let inside = 0
      const where: string[] = []
      for (const t of snap) {
        // Only the tile the cut is in: another tile may be repainted a fraction of a pixel off.
        if (cut.y < t.top || cut.y > t.top + t.c.height / t.k) continue
        const now = t.c
          .getContext('2d')!
          .getImageData(0, 0, t.c.width, t.c.height).data
        for (let i = 0; i < t.alpha.length; i++) {
          if (Math.abs(now[i * 4 + 3] - t.alpha[i]) <= 24) continue
          const x = t.left + (i % t.c.width) / t.k
          const y = t.top + Math.floor(i / t.c.width) / t.k
          if (
            skip.some((q) => Math.abs(x - q.x) <= 2 && Math.abs(y - q.y) <= 2)
          )
            continue
          if (Math.hypot(x - cut.x, y - cut.y) > r) {
            outside++
            if (where.length < 8)
              where.push(
                Math.round(x) +
                  ',' +
                  Math.round(y) +
                  ' alpha ' +
                  t.alpha[i] +
                  '>' +
                  now[i * 4 + 3],
              )
          } else inside++
        }
      }
      return { outside, inside, where }
    },
    { cut, r, skip },
  )

/** Waits until the saved ink is the cut pieces (saving is a moment after the rub). */
async function cutPieces(page: Page) {
  await expect
    .poll(async () => {
      const { strokes } = await savedInk(page)
      return strokes.length > 0 && strokes.every((s) => s.flat === true)
    })
    .toBe(true)
  return (await savedInk(page)).strokes
}

/** Waits until Undo has put the original shape back. */
async function originalBack(page: Page, shape: string) {
  await expect
    .poll(async () => (await savedInk(page)).strokes.map((s) => s.shape))
    .toEqual([shape])
  return (await savedInk(page)).strokes[0]
}

async function drawShape(
  page: Page,
  drawAs: 'rect' | 'ellipse',
  mode: 'standard' | 'precise',
) {
  await installRealPen(page)
  await inkNote(page, 'Pen', 'pencil', {
    'ink.pen': { drawAs, shapeFill: false },
    'ink.eraser': { mode },
  })
  const box = await textBox(page)
  const a: [number, number] = [box.x + 60, box.y + 80]
  const b: [number, number] = [box.x + 360, box.y + 260]
  await stroke(page, line(a, b))
  const [s] = await expectStrokes(page, 1)
  expect(s.shape).toBe(drawAs)
  await tool(page, 'Eraser').click()
  await page.waitForTimeout(600)
  return { a, b, original: s }
}

for (const mode of ['standard', 'precise'] as const) {
  test(`C2 ${mode}: erasing the middle of an oval's edge leaves the rest where it was; Undo restores the oval`, async ({
    page,
  }) => {
    const { a, b, original } = await drawShape(page, 'ellipse', mode)
    const cx = (a[0] + b[0]) / 2
    await snapshot(page)
    // Rub across the top edge, in the middle.
    await realPen(
      page,
      pen(line([cx - 10, a[1] - 14], [cx + 10, a[1] + 14], 8)),
    )
    const after = await cutPieces(page)
    // Everything away from the cut is pixel for pixel as before.
    const diff = await changed(page, { x: cx, y: a[1] }, 110)
    expect(diff.inside).toBeGreaterThan(0)
    expect(diff.outside).toBe(0)
    expect(after.every((s) => s.shape === undefined)).toBe(true)
    const o = bounds(original.pts)
    const rx = (o.x1 - o.x0) / 2
    const ry = (o.y1 - o.y0) / 2
    const mx = (o.x0 + o.x1) / 2
    const my = (o.y0 + o.y1) / 2
    const left = after.flatMap((s) => s.pts)
    const xs = px(left, 0)
    const ys = px(left, 1)
    let topCut = true
    for (let i = 0; i < xs.length; i++) {
      // Every remaining point is still on the oval.
      const e = ((xs[i] - mx) / rx) ** 2 + ((ys[i] - my) / ry) ** 2
      expect(Math.abs(e - 1)).toBeLessThan(0.01)
      if (Math.abs(xs[i] - mx) < rx * 0.02 && ys[i] < my) topCut = false
    }
    expect(topCut).toBe(true)
    // The bottom, left and right of the oval are all still there.
    expect(Math.max(...ys)).toBeCloseTo(o.y1, 3)
    expect(Math.min(...xs)).toBeCloseTo(o.x0, 3)
    expect(Math.max(...xs)).toBeCloseTo(o.x1, 3)

    await tool(page, 'Undo').click()
    const back = await originalBack(page, 'ellipse')
    expect(back.pts).toEqual(original.pts)
  })

  test(`C2 ${mode}: erasing a rectangle's corner keeps both sides straight; Undo restores it`, async ({
    page,
  }) => {
    const { a, b, original } = await drawShape(page, 'rect', mode)
    await snapshot(page)
    await realPen(
      page,
      pen(line([b[0] - 16, a[1] - 16], [b[0] + 16, a[1] + 16], 8)),
    )
    const after = { strokes: await cutPieces(page) }
    // owner, 25 Nov: the four corner points of the rectangle (corner +-2 px) are the only
    // pixels the compare ignores; every other pixel outside the cut must be unchanged.
    const corners = [
      { x: a[0], y: a[1] },
      { x: b[0], y: a[1] },
      { x: b[0], y: b[1] },
      { x: a[0], y: b[1] },
    ]
    const diff = await changed(page, { x: b[0], y: a[1] }, 110, corners)
    expect(diff.inside).toBeGreaterThan(0)
    expect(diff.outside, 'where: ' + JSON.stringify(diff.where)).toBe(0)
    const strokes = after.strokes
    expect(strokes.length).toBeGreaterThanOrEqual(1)
    expect(strokes.every((s) => s.shape === undefined)).toBe(true)
    const o = bounds(original.pts)
    const near = (v: number, t: number) => Math.abs(v - t) < 1e-3
    const pts = strokes.flatMap((s) => s.pts)
    const xs = px(pts, 0)
    const ys = px(pts, 1)
    for (let i = 0; i < xs.length; i++) {
      // On the outline: nothing joins the cut ends with a slanted line.
      const onSide =
        near(xs[i], o.x0) ||
        near(xs[i], o.x1) ||
        near(ys[i], o.y0) ||
        near(ys[i], o.y1)
      expect(onSide).toBe(true)
      // The cut corner (top right) has no ink left.
      expect(near(xs[i], o.x1) && near(ys[i], o.y0)).toBe(false)
    }
    // The other three corners are still there.
    const has = (x: number, y: number) =>
      xs.some((v, i) => near(v, x) && near(ys[i], y))
    expect(has(o.x0, o.y0)).toBe(true)
    expect(has(o.x0, o.y1)).toBe(true)
    expect(has(o.x1, o.y1)).toBe(true)

    await tool(page, 'Undo').click()
    const back = await originalBack(page, 'rect')
    expect(back.pts).toEqual(original.pts)
  })
}
