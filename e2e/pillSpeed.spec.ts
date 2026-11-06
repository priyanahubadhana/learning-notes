// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Pill-tap speed (Phase A4, owner: "laggy"): the time from pressing a main
 * bar tool to its options pill being on screen. Target 100 ms on a normal
 * computer; the limit here is wider because CI machines are slow. The number
 * measured is attached to the report.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

test('a tool tap shows its pill quickly', async ({ page }, info) => {
  await openNote(page)
  const times: number[] = []
  for (const name of ['Pen', 'Highlighter', 'Eraser', 'Pen']) {
    const ms = await page.evaluate(async (label) => {
      const button = document.querySelector<HTMLElement>(
        `[data-main-bar] [aria-label="${label}"]`,
      )!
      return new Promise<number>((resolve) => {
        const seen = () => document.querySelector('[data-options-pill]')
        const t0 = performance.now()
        const watch = new MutationObserver(() => {
          const pill = seen()
          if (pill && pill.getBoundingClientRect().width > 0) {
            watch.disconnect()
            requestAnimationFrame(() => resolve(performance.now() - t0))
          }
        })
        watch.observe(document.body, { childList: true, subtree: true })
        button.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            pointerType: 'touch',
          }),
        )
        button.click()
        setTimeout(() => resolve(-1), 2000)
      })
    }, name)
    times.push(ms)
    // Close the pill for the next round.
    await tool(page, name).click()
    await page.waitForTimeout(150)
  }
  info.annotations.push({ type: 'pill ms', description: times.join(', ') })
  console.log('pill ms', times.join(', '))
  for (const ms of times.slice(0, 1)) {
    expect(ms).toBeGreaterThan(0)
    expect(ms).toBeLessThan(400)
  }
})
