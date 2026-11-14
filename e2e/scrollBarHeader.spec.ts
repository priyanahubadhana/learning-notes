// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, showSidebar, startInMode } from './helpers.ts'

/**
 * P1.4 fix (owner re-check): the sidebar's "+" (New notebook) was covered by
 * the bar thumb's 44 pt touch area once the list scrolled (6+ notebooks).
 *  SC-18 when a list overflows → no part of its bar (thumb touch area, track,
 *        arrows) sits over any button or field of that list, at any scroll
 *        position; a tap or a Pencil tap on "+" creates a notebook.
 */
const ON = '/?flags=foundation.shell'
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
    for (const b of Array.from(
      side.querySelectorAll<HTMLElement>('button, input, a'),
    )) {
      const r = b.getBoundingClientRect()
      const s = sc.getBoundingClientRect()
      if (r.width === 0 || r.bottom < s.top || r.top > s.bottom) continue
      for (const [x, y] of [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.right - 3, r.top + 3],
        [r.right - 3, r.bottom - 3],
        [r.left + 3, r.top + r.height / 2],
      ]) {
        const hit = document.elementFromPoint(x, y)
        if (hit?.closest('.sbar'))
          bad.push(b.getAttribute('aria-label') ?? b.textContent ?? 'button')
      }
    }
    return { bad, max: sc.scrollHeight - sc.clientHeight }
  }, scrollTop)
}

for (const [name, size] of Object.entries(SIZES)) {
  test(`SC-18 ${name}: no bar part sits over a sidebar control; "+" creates a notebook (tap and Pencil)`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await startInMode(page, 'pencil')
    await page.goto(ON)
    // The upright drawer is slow to fill by hand: one notebook, then copies of its row.
    for (let i = 1; i <= (name === 'upright' ? 1 : 7); i++)
      await createNotebook(page, `Book ${i}`, `Page ${i}`)
    const side = page.locator('aside#sidebar')
    await showSidebar(page)
    await expect(side.locator('[data-notebook-row]').last()).toBeVisible()
    if (name === 'upright')
      await side
        .locator('[data-notebook-row]')
        .first()
        .evaluate((row) => {
          for (let i = 0; i < 12; i++)
            row.parentElement!.appendChild(row.cloneNode(true))
        })
    // The drawer has stopped sliding and the bar has followed it.
    await page.waitForTimeout(1500)
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
