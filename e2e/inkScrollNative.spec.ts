// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import {
  expectStrokes,
  inkClientBox,
  inkNote,
  line,
  stroke,
  textBox,
} from './inkHelpers.ts'

/**
 * 9 Nov 2026: the ink overlay lives inside the page's scroller, so the browser
 * scrolls the ink with the text. Scrolling runs no ink script (no repaint, no
 * re-placing), the overlay can never land over the bars (the scroller clips
 * it), and it stays on its words at every zoom.
 */
test.use({ viewport: { width: 1100, height: 900 }, hasTouch: true })

test('the ink scrolls with the page by itself and stays on its words at zoom', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'touch')
  const box = await textBox(page)
  const y = box.y + 10
  await stroke(page, line([box.x + 10, y], [box.x + 200, y]))
  await expectStrokes(page, 1)
  await page.waitForTimeout(300)

  // The overlay is inside the scroller.
  expect(
    await page.evaluate(() => {
      const s = document.querySelector('[data-page-scroller]')!
      const o = document.querySelector('[data-ink-overlay]')!
      return s.contains(o)
    }),
  ).toBe(true)

  const before = (await inkClientBox(page))!
  expect(before).not.toBeNull()
  // Count every paint call from now on; scrolling must make none.
  await page.evaluate(() => {
    const w = window as unknown as { __paints: number }
    w.__paints = 0
    const ctx = CanvasRenderingContext2D.prototype
    for (const name of ['stroke', 'fill', 'clearRect', 'drawImage'] as const) {
      const orig = ctx[name] as (...a: unknown[]) => void
      ;(ctx as unknown as Record<string, unknown>)[name] = function (
        this: CanvasRenderingContext2D,
        ...a: unknown[]
      ) {
        w.__paints++
        return orig.apply(this, a)
      }
    }
  })
  const moved = await page.evaluate(async () => {
    const s = document.querySelector<HTMLElement>('[data-page-scroller]')!
    const top = s.scrollTop
    for (let i = 0; i < 12; i++) {
      s.scrollTop += 25
      await new Promise((r) => requestAnimationFrame(r))
    }
    await new Promise((r) => setTimeout(r, 200))
    return s.scrollTop - top
  })
  expect(moved).toBeGreaterThan(100)
  const after = (await inkClientBox(page))!
  // The ink moved with the text, exactly as far as the page scrolled.
  expect(Math.round(before.y0 - after.y0)).toBe(Math.round(moved))
  expect(
    await page.evaluate(
      () => (window as unknown as { __paints: number }).__paints,
    ),
  ).toBe(0)

  // Nothing of the overlay lies over the bars above the scroller.
  const over = await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')!
    const r = s.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top - 6)
    return !!hit?.closest('[data-ink-overlay]')
  })
  expect(over).toBe(false)

  // Zoom in: the ink stays on its line of text.
  await page.evaluate(() => {
    document.querySelector('[data-page-scroller]')!.scrollTop = 0
  })
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.waitForTimeout(600)
  const geo = await page.evaluate(() => {
    const o = document
      .querySelector('[data-ink-overlay]')!
      .getBoundingClientRect()
    const w = document.querySelector('.bn-container')!.getBoundingClientRect()
    const b = [...document.querySelectorAll('.bn-block-content')]
      .find((e) => e.textContent?.includes('nucleus'))!
      .getBoundingClientRect()
    return { ow: o.width, ww: w.width, by: b.y, bh: b.height }
  })
  expect(Math.abs(geo.ow - geo.ww)).toBeLessThan(1.5)
  const z = (await inkClientBox(page))!
  expect(z.y0).toBeGreaterThan(geo.by - 6)
  expect(z.y1).toBeLessThan(geo.by + geo.bh + 6)
})

test('only the tiles near the screen hold canvases', async ({ page }) => {
  await inkNote(page, 'Pen', 'touch')
  const box = await textBox(page)
  await stroke(page, line([box.x + 10, box.y + 10], [box.x + 200, box.y + 10]))
  await expectStrokes(page, 1)
  const tiles = await page.evaluate(
    () => document.querySelectorAll('[data-ink-tile]').length,
  )
  expect(tiles).toBeGreaterThan(0)
  expect(tiles).toBeLessThanOrEqual(6)
})
