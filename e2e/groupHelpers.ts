// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { tool } from './mainBarHelpers.ts'

/**
 * A Lasso loop on empty paper round the boxes with these positions among the
 * page's boxes. Played on the paper's sheets like paperPage.spec.ts does.
 */
export async function lassoAround(page: Page, which: number[]) {
  await tool(page, 'Lasso').click()
  // Close the Lasso's options pill; the page then holds still.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
  await page.evaluate(async (idx) => {
    const sheets = document.querySelector('[data-paper-sheets]')!
    const frame = () => new Promise((r) => requestAnimationFrame(r))
    const rs = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-paper-box]:not([data-paper-box="main"])',
      ),
    ]
      .filter((_, i) => idx.includes(i))
      .map((e) => e.getBoundingClientRect())
    const l = Math.min(...rs.map((r) => r.left)) - 24
    const r = Math.max(...rs.map((q) => q.right)) + 24
    const tp = Math.min(...rs.map((q) => q.top)) - 24
    const bt = Math.max(...rs.map((q) => q.bottom)) + 24
    const send = (type: string, x: number, y: number) =>
      sheets.dispatchEvent(
        new PointerEvent(type, {
          pointerType: 'mouse',
          pointerId: 1,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
        }),
      )
    send('pointerdown', l, tp)
    for (let i = 0; i < 10; i++) await frame()
    const path = [
      [l, tp],
      [r, tp],
      [r, bt],
      [l, bt],
      [l, tp + 4],
    ]
    for (let i = 1; i < path.length; i++)
      for (let k = 1; k <= 6; k++) {
        const [x0, y0] = path[i - 1]
        const [x1, y1] = path[i]
        send('pointermove', x0 + ((x1 - x0) * k) / 6, y0 + ((y1 - y0) * k) / 6)
        await frame()
      }
    send('pointerup', l, tp + 4)
  }, which)
}
