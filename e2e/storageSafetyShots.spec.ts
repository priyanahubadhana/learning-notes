// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * SHOTS-only helper for gate 3 (storage safety, flag `storage.safety`): every
 * banner, the Show how pop-up and both toasts at phone, iPad portrait,
 * iPad landscape and PC in light, dark and sepia. Run with SHOTS=1.
 */
const SHOTS = process.env.SHOTS
const DIR = process.env.SHOTS_DIR ?? 'screenshots/gate3-ss'
const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-portrait': { width: 820, height: 1180 },
  'ipad-landscape': { width: 1180, height: 820 },
  pc: { width: 1336, height: 900 },
} as const
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

test.use({ userAgent: IPAD_UA })

async function shoot(page: Page, name: string, size: string) {
  for (const [label, attr] of Object.entries(THEMES)) {
    await page.evaluate(
      (v) => document.documentElement.setAttribute('data-theme', v),
      attr,
    )
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${DIR}/${name}-${size}-${label}.png` })
  }
}

const failSave = (page: Page, name: string) =>
  page.evaluate((n) => {
    void Promise.reject(Object.assign(new Error('refused'), { name: n }))
  }, name)

for (const [size, vp] of Object.entries(SIZES)) {
  test(`gate 3 shots ${size}`, async ({ page }) => {
    test.skip(!SHOTS, 'gate 3 screenshots only (SHOTS=1)')
    test.setTimeout(120_000)
    await page.setViewportSize(vp)
    await page.goto('/?flags=storage.safety#/')
    const banner = page.getByTestId('attention-banner')
    await expect(banner).toHaveAttribute('data-code', 'homeScreen')
    await shoot(page, 'install-banner', size)
    await banner.getByRole('button', { name: 'Show how' }).click()
    await expect(page.getByTestId('ss-howto')).toBeVisible()
    await page.waitForTimeout(400)
    await shoot(page, 'howto-dialog', size)
    await page.getByTestId('ss-backup-first').click()
    await expect(page.getByText('Backup saved to Downloads.')).toBeVisible()
    await shoot(page, 'toast-saved', size)
    await page.keyboard.press('Escape')
    await failSave(page, 'QuotaExceededError')
    await expect(banner).toHaveAttribute('data-code', 'storageFull')
    await page.waitForTimeout(4500)
    await shoot(page, 'full-banner', size)
    await page.evaluate(() => {
      URL.createObjectURL = () => {
        throw new Error('blocked')
      }
    })
    await banner.getByRole('button', { name: 'Back up' }).click()
    await expect(page.getByText('Backup could not be saved.')).toBeVisible()
    await shoot(page, 'toast-failed', size)
    await failSave(page, 'DatabaseClosedError')
    await expect(banner).toHaveAttribute('data-code', 'storageLost')
    await shoot(page, 'lost-banner', size)
  })
}
