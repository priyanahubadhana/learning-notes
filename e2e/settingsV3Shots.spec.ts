import { test } from '@playwright/test'

/**
 * Pictures of the Settings v3 shell for review against the mock:
 * Beginner / Professional x Day / Night x iPad landscape / phone.
 * Only runs with SHOTS=1 (`SHOTS=1 npx playwright test settingsV3Shots`).
 */
const OUT = 'docs/mockups/settings-v3-build-shots'
const SIZES = {
  ipad: { width: 1194, height: 834 },
  phone: { width: 390, height: 844 },
} as const

test.skip(!process.env.SHOTS, 'pictures only on request')

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['day', 'night'] as const)
    for (const [name, viewport] of Object.entries(SIZES))
      test(`shot ${level} ${theme} ${name}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport,
          hasTouch: true,
          isMobile: name === 'phone',
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
                  {
                    name: 'learning-notes:theme',
                    value: JSON.stringify(theme),
                  },
                  {
                    name: 'learning-notes:level',
                    value: JSON.stringify({ level, unlocked: [] }),
                  },
                ],
              },
            ],
          },
        })
        const page = await context.newPage()
        await page.goto('/?flags=settings.v3#/settings/general')
        await page.locator('[data-settings-v3]').waitFor()
        if (name === 'ipad')
          await page.getByRole('button', { name: 'Hide menu' }).click()
        await page.waitForTimeout(600)
        if (name === 'phone') {
          await page.locator('[data-preview-pill]').tap()
          await page.waitForTimeout(600)
        }
        await page.screenshot({
          path: `${OUT}/${level}-${theme}-${name}.png`,
        })
        await context.close()
      })
