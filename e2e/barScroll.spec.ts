import { expect, test } from '@playwright/test'
import { mainBar, openNote, tool } from './mainBarHelpers.ts'

/**
 * Scrollable bars (R7-14, R7-17): a "more this way" cue (fade, chevron and a
 * count) and a thin handle to slide the bar, only while the bar overflows;
 * dragging the handle never activates a tool.
 */

const MANY = [
  'bold',
  'italic',
  'underline',
  'code',
  'alignCenter',
  'indent',
  'outdent',
  'link',
]

test.describe('a bar that fits', () => {
  test.use({ viewport: { width: 1336, height: 800 }, hasTouch: true })
  test('shows no cue and no handle', async ({ page }) => {
    await openNote(page)
    await expect(mainBar(page)).toBeVisible()
    await expect(page.locator('[data-scroll-cue]')).toHaveCount(0)
    await expect(page.locator('[data-bar-track]')).toHaveCount(0)
  })
})

test.describe('a bar that overflows', () => {
  test.use({ viewport: { width: 560, height: 800 }, hasTouch: true })

  test('shows the cue and the handle; dragging the handle slides the bar and never taps a tool', async ({
    page,
  }) => {
    await openNote(page, 'touch', { 'toolbar.extras': MANY })
    const cue = page.locator('[data-scroll-cue="end"]')
    await expect(cue).toBeVisible()
    await expect(page.locator('[data-scroll-count]')).toBeVisible()
    await expect(page.locator('[data-scroll-cue="start"]')).toHaveCount(0)
    const track = page.locator('[data-bar-track]')
    await expect(track).toBeVisible()

    const scroller = page.locator('[data-bar-scroll] [data-slot="tools"]')
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0)
    const box = (await page.locator('[data-bar-thumb]').boundingBox())!
    const t = (await track.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(t.x + t.width - 4, box.y + box.height / 2, {
      steps: 8,
    })
    await page.mouse.up()
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50)
    await expect(page.locator('[data-scroll-cue="start"]')).toBeVisible()
    // No tool was activated by the drag: Text is still the mode, no pill.
    await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-options-pill]')).toHaveCount(0)
    // The end of the bar: no "more" cue any more.
    await expect(page.locator('[data-scroll-cue="end"]')).toHaveCount(0)
  })

  test('tapping the chevron slides the bar', async ({ page }) => {
    await openNote(page, 'touch', { 'toolbar.extras': MANY })
    const scroller = page.locator('[data-bar-scroll] [data-slot="tools"]')
    await page.locator('[data-scroll-cue="end"]').click()
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(50)
  })
})

test.describe('the "more tools" arrow has its own place', () => {
  test.use({ viewport: { width: 560, height: 800 }, hasTouch: true })

  // Why: the arrow sat on top of the last tool (Backspace) and hid it.
  test('the arrows never cover a tool, at the start, in the middle and at the end', async ({
    page,
  }) => {
    await openNote(page, 'touch', { 'toolbar.extras': MANY })
    const scroller = page.locator('[data-bar-scroll] [data-slot="tools"]')
    const overlap = async (starts: boolean, ends: boolean) => {
      // The arrows that must show are there (not skipped), and the others are not.
      await expect(page.locator('[data-scroll-cue="start"]')).toHaveCount(
        starts ? 1 : 0,
      )
      await expect(page.locator('[data-scroll-cue="end"]')).toHaveCount(
        ends ? 1 : 0,
      )
      // Measured after the arrows are in: they take their own room.
      await page.waitForTimeout(150)
      const s = (await scroller.boundingBox())!
      for (const side of ['start', 'end']) {
        if (side === 'start' ? !starts : !ends) continue
        const c = (await page
          .locator(`[data-scroll-cue="${side}"]`)
          .boundingBox())!
        // The arrow sits outside the strip that holds the tools.
        const clear = c.x + c.width <= s.x + 0.5 || c.x >= s.x + s.width - 0.5
        expect(clear, `${side} arrow overlaps the tools`).toBe(true)
      }
    }
    await overlap(false, true)
    await scroller.evaluate((el) => (el.scrollLeft = 80))
    await overlap(true, true)
    await scroller.evaluate((el) => (el.scrollLeft = el.scrollWidth))
    await overlap(true, false)
  })
})
