import { test } from '@playwright/test'

/**
 * Pictures of every Settings v3 section for review against the mock:
 * Beginner / Professional x Day / Night x iPad (1024x768 touch) / phone (390x844).
 * Files: docs/mockups/settings-v3-build-shots/<section>-<level>-<theme>-<device>.png
 * Only runs with SHOTS=1 (`SHOTS=1 PW_PORT=... npx playwright test settingsV3Shots`);
 * SHOT_SECTION limits it to one section.
 */
const OUT = 'docs/mockups/settings-v3-build-shots'
const SIZES = {
  ipad: { width: 1024, height: 768 },
  phone: { width: 390, height: 844 },
} as const

test.skip(!process.env.SHOTS, 'pictures only on request')
test.setTimeout(240_000)

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['day', 'night'] as const)
    for (const [device, viewport] of Object.entries(SIZES))
      test(`shots ${level} ${theme} ${device}`, async ({ browser }) => {
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
        // The hidden Try new features list is open for the pictures.
        await page.addInitScript(() =>
          sessionStorage.setItem('learning-notes:v3.tryNew', '1'),
        )
        await page.goto('/?flags=settings.v3#/settings/general')
        await page.locator('[data-settings-v3]').waitFor()
        const hide = page.getByRole('button', { name: 'Hide menu' })
        if (await hide.isVisible().catch(() => false)) await hide.click()
        const ids = await page
          .locator('[data-section]')
          .evaluateAll((els) => els.map((e) => e.getAttribute('data-section')!))
        for (const id of ids) {
          if (process.env.SHOT_SECTION && process.env.SHOT_SECTION !== id)
            continue
          await page.locator(`[data-section="${id}"]`).first().click()
          await page.locator('.sv3-main').waitFor()
          // Rows and today's own screens load from the database a moment later.
          await page
            .locator(
              '.sv3-main .sv3-row, .sv3-main .sv3-area, .sv3-main .sv3-prof',
            )
            .first()
            .waitFor({ timeout: 3000 })
            .catch(() => {})
          await page.waitForTimeout(500)
          await page.screenshot({
            path: `${OUT}/${id}-${level}-${theme}-${device}.png`,
          })
        }
        await context.close()
      })
