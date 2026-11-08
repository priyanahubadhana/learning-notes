import { expect, test } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Polish 2, item 7: the options pill gets the bar's "more this way" cue and
 * handle when a narrow window cuts it off.
 */

test.describe('the options pill in a narrow window', () => {
  test.use({ viewport: { width: 520, height: 800 }, hasTouch: true })

  test('shows the cue and the handle, and the handle slides the pill', async ({
    page,
  }) => {
    await openNote(page)
    await tool(page, 'Text').click()
    const pill = page.locator('[data-options-pill="text"]')
    await expect(pill).toBeVisible()
    await expect(pill.locator('[data-scroll-cue="end"]')).toBeVisible()
    // The grip, pin and close stay in view while the options slide.
    await expect(pill.locator('[data-pill-close]')).toBeVisible()
    const scroller = pill.locator('[data-slot="tools"]')
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0)
    const track = pill.locator('[data-bar-track]')
    await expect(track).toBeVisible()
    const thumb = (await pill.locator('[data-bar-thumb]').boundingBox())!
    const t = (await track.boundingBox())!
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
    await page.mouse.down()
    await page.mouse.move(t.x + t.width - 4, thumb.y + thumb.height / 2, {
      steps: 8,
    })
    await page.mouse.up()
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(20)
    await expect(pill.locator('[data-scroll-cue="start"]')).toBeVisible()
  })
})
