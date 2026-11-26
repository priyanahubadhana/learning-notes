// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'
import { startInTheme } from './helpers.ts'
import { stuckRestart } from './updateStuck.helper.ts'

/** C22 pictures: the restart notice with "Restart now" and "Couldn't restart". Only with SHOTS=1. */
const OUT = 'screenshots/c22'
const SIZES = {
  'ipad-upright': { width: 834, height: 1194 },
  'ipad-sideways': { width: 1194, height: 834 },
  phone: { width: 390, height: 844 },
} as const

// test-guard-reason: picture files are made only on request
test.skip(!process.env.SHOTS, 'pictures only on request')
test.setTimeout(120_000)

for (const theme of ['day', 'night'] as const)
  for (const [device, size] of Object.entries(SIZES))
    test(`c22 shots ${theme} ${device}`, async ({ page }) => {
      await page.setViewportSize(size)
      await startInTheme(page, theme)
      await stuckRestart(page)
      const btn = page.locator('[data-restart-now]')
      await expect(btn).toHaveText('Restart now', { timeout: 25_000 })
      await page.screenshot({
        path: `${OUT}/restart-now-${theme}-${device}.png`,
      })
      await btn.click()
      await expect(btn).toHaveText("Couldn't restart. Tap to try again", {
        timeout: 30_000,
      })
      await page.screenshot({
        path: `${OUT}/couldnt-restart-${theme}-${device}.png`,
      })
    })
