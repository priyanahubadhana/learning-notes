import { test } from '@playwright/test'

/**
 * Gate 3 re-shoot (13 Nov): changed Settings v3 sections in Light, Dark and
 * Sepia on iPad landscape (1194), iPad portrait (834) and phone (390).
 * Files: docs/mockups/settings-v3-build-shots/gate3/<section>-<theme>-<device>.png
 * Only with SHOTS=1.
 */
const OUT = 'docs/mockups/settings-v3-build-shots/gate3'
const SIZES = {
  'ipad-landscape': { width: 1194, height: 834 },
  'ipad-portrait': { width: 834, height: 1194 },
  phone: { width: 390, height: 844 },
} as const
const SECTIONS = ['experience', 'general', 'review', 'sync', 'account']
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const

test.skip(!process.env.SHOTS, 'pictures only on request')
test.setTimeout(240_000)

for (const [themeName, theme] of Object.entries(THEMES))
  for (const [device, viewport] of Object.entries(SIZES))
    test(`gate3 shots ${themeName} ${device}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport,
        hasTouch: true,
        isMobile: device === 'phone',
        storageState: {
          cookies: [],
          origins: [
            {
              origin: new URL(
                process.env.PW_BASE ??
                  `http://localhost:${process.env.PW_PORT}`,
              ).origin,
              localStorage: [
                { name: 'learning-notes:devicePicker.done', value: 'true' },
                { name: 'learning-notes:onboarding.done', value: 'true' },
                { name: 'learning-notes:accountGate.off', value: '1' },
                { name: 'learning-notes:theme', value: JSON.stringify(theme) },
              ],
            },
          ],
        },
      })
      const page = await context.newPage()
      for (const id of SECTIONS) {
        await page.goto(`/?flags=settings.v3,foundation.shell#/settings/${id}`)
        await page.locator('[data-settings-v3]').waitFor()
        const hide = page.getByRole('button', { name: 'Hide menu' })
        if (await hide.isVisible().catch(() => false)) await hide.click()
        await page.waitForTimeout(700)
        await page.screenshot({
          path: `${OUT}/${id}-${themeName}-${device}.png`,
        })
      }
      await context.close()
    })
