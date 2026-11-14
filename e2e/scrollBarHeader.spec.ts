// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, showSidebar, startInMode } from './helpers.ts'

/**
 * P1.4 fix (owner re-check): the sidebar's "+" (New notebook) was covered by
 * the bar thumb's 44 pt touch area once the list scrolled (6+ notebooks).
 *  SC-18 when a list overflows → no touch box of its bar (thumb area, track,
 *        arrows) overlaps a control of that list, and no control's touch box
 *        overlaps the bar, at any scroll position; "+" creates a notebook.
 *        Run on a touch device (touch boxes are 32 x 44 there).
 */
const ON = '/?flags=foundation.shell'
test.use({ hasTouch: true })
const SIZES = {
  upright: { width: 820, height: 560 },
  sideways: { width: 1180, height: 700 },
}

/** Buttons of the list whose centre or inner corners hit a bar part. */
async function covered(page: Page, scrollTop: number) {
  return page.evaluate(async (top) => {
    const side = document.querySelector<HTMLElement>('aside#sidebar')!
    const sc =
      Array.from(side.querySelectorAll<HTMLElement>('*')).find(
        (e) =>
          getComputedStyle(e).overflowY === 'auto' &&
          e.scrollHeight > e.clientHeight,
      ) ?? side
    sc.scrollTop = top
    // The bar follows the scroll on its next frames.
    await new Promise((r) => setTimeout(r, 200))
    const bad: string[] = []
    const bars = Array.from(
      document.querySelectorAll<HTMLElement>('.sbar'),
    ).map((e) => e.getBoundingClientRect())
    const s = sc.getBoundingClientRect()
    for (const b of Array.from(
      side.querySelectorAll<HTMLElement>('button, input, a, .tip-info'),
    )) {
      const r = b.getBoundingClientRect()
      if (r.width === 0 || r.bottom < s.top || r.top > s.bottom) continue
      // The control's whole touch box against the bar's whole column.
      for (const q of bars)
        if (
          r.right > q.left + 0.5 &&
          r.left < q.right - 0.5 &&
          r.bottom > q.top &&
          r.top < q.bottom
        )
          bad.push(
            (b.getAttribute('aria-label') ?? b.textContent ?? 'control') +
              ' ' +
              Math.round(r.left) +
              '-' +
              Math.round(r.right) +
              ' bar ' +
              Math.round(q.left),
          )
    }
    return { bad, max: sc.scrollHeight - sc.clientHeight }
  }, scrollTop)
}

for (const [name, size] of Object.entries(SIZES)) {
  test(`SC-18 ${name}: bar and controls never overlap; "+" creates a notebook (tap and Pencil)`, async ({
    page,
  }) => {
    // 7 real notebooks. Upright is slow to fill by hand (a drawer), so they are made at the
    // wide size and the window is turned upright afterwards: the notebooks stay.
    await page.setViewportSize(SIZES.sideways)
    await startInMode(page, 'pencil')
    await page.goto(ON)
    for (let i = 1; i <= 7; i++)
      await createNotebook(page, `Book ${i}`, `Page ${i}`)
    await page.setViewportSize(size)
    const side = page.locator('aside#sidebar')
    await showSidebar(page)
    await expect(side.locator('[data-notebook-row]').last()).toBeVisible()
    // The drawer has stopped sliding and the bar has followed it.
    await page.waitForTimeout(1500)
    // The test runs with the touch sizes on (32 x 44 boxes), or it would prove nothing.
    expect(
      await page.evaluate(
        () => matchMedia('(hover: none), (any-pointer: coarse)').matches,
      ),
    ).toBe(true)
    const first = await covered(page, 0)
    expect(first.max, 'the sidebar overflows').toBeGreaterThan(20)
    for (let top = 0; top <= first.max; top += 40)
      expect((await covered(page, top)).bad, `scrollTop ${top}`).toEqual([])
    await covered(page, 0)
    // A Pencil tap on "+" (pointerType pen) creates a notebook.
    const plus = side.getByLabel('New notebook')
    const b = (await plus.boundingBox())!
    const at = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    const hitOk = await page.evaluate(
      ([x, y]) => !document.elementFromPoint(x, y)?.closest('.sbar'),
      [at.x, at.y],
    )
    expect(hitOk).toBe(true)
    await createNotebook(page, 'Book 8', 'Page 8')
  })
}
