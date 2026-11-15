// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** First-look pictures for the 2A.14 Layout shortcut row (Settings, Advanced). Run by hand. */
const OUT =
  process.env.SHOTS_OUT ?? 'docs/mockups/toolbar-v9-build-shots/2a14-layout'
const SIZES = [
  ['ipad-upright', 820, 1180],
  ['ipad-sideways', 1180, 820],
  ['phone', 390, 844],
] as const

test.skip(!process.env.SHOTS, 'pictures are taken by hand (SHOTS=1)')
test.use({ hasTouch: true })

for (const screen of ['today', 'v3'] as const)
  for (const level of ['beginner', 'professional'] as const)
    for (const theme of ['light', 'dark'] as const)
      for (const [size, width, height] of SIZES)
        test(`layout ${screen} ${level} ${theme} ${size}`, async ({ page }) => {
          await page.setViewportSize({ width, height })
          await page.emulateMedia({ colorScheme: theme })
          await page.addInitScript(
            (x) => {
              localStorage.setItem(
                'learning-notes:level',
                JSON.stringify({ level: x.level, unlocked: [] }),
              )
              localStorage.setItem(
                'learning-notes:theme',
                JSON.stringify(x.theme === 'dark' ? 'night' : x.theme),
              )
            },
            { level, theme },
          )
          await page.goto(
            screen === 'v3'
              ? '/?flags=toolbar.v8,settings.v3#/settings/toolbar'
              : '/?flags=toolbar.v8#/settings',
          )
          await page.reload()
          if (screen === 'today')
            await page
              .getByRole('tab', { name: /advanced/i })
              .first()
              .click()
              .catch(() => {})
          const row = page.locator(
            '[data-setting-id="advanced.layoutShortcut"]',
          )
          await row.waitFor()
          await row.evaluate((el) => el.scrollIntoView({ block: 'center' }))
          await page.waitForTimeout(600)
          mkdirSync(OUT, { recursive: true })
          await page.screenshot({
            path: `${OUT}/${screen}-${level}-${theme}-${size}.png`,
          })
        })
