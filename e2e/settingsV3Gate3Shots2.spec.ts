import { test } from '@playwright/test'

/**
 * Gate 3 third re-shoot (13 Nov): Settings v3 sections touched by the 10 fixes,
 * Light/Dark/Sepia x phone/iPad portrait/PC x Beginner/Professional.
 * Files: screenshots/gate3-3/<section>-<level>-<theme>-<device>.png. Only with SHOTS=1.
 */
const OUT = 'screenshots/gate3-3'
const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-portrait': { width: 820, height: 1180 },
  pc: { width: 1440, height: 900 },
} as const
const SECTIONS = ['', 'experience', 'general', 'sync', 'account']
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const
const LEVELS = {
  beginner: { level: 'beginner', unlocked: [] },
  pro: { level: 'professional' },
} as const

test.skip(!process.env.SHOTS, 'pictures only on request')
test.setTimeout(300_000)

for (const [themeName, theme] of Object.entries(THEMES))
  for (const [device, viewport] of Object.entries(SIZES))
    test(`gate3-3 ${themeName} ${device}`, async ({ browser }) => {
      for (const [levelName, level] of Object.entries(LEVELS)) {
        const context = await browser.newContext({
          viewport,
          hasTouch: device !== 'pc',
          isMobile: device === 'phone',
          storageState: {
            cookies: [],
            origins: [
              {
                origin: `http://localhost:${process.env.PW_PORT}`,
                localStorage: [
                  { name: 'learning-notes:devicePicker.done', value: 'true' },
                  { name: 'learning-notes:onboarding.done', value: 'true' },
                  { name: 'learning-notes:accountGate.off', value: '1' },
                  { name: 'learning-notes:theme', value: JSON.stringify(theme) },
                  { name: 'learning-notes:level', value: JSON.stringify(level) },
                ],
              },
            ],
          },
        })
        const page = await context.newPage()
        for (const id of SECTIONS) {
          await page.goto(`/?flags=settings.v3,foundation.shell#/settings${id ? "/" + id : ""}`)
          await page.locator('[data-settings-v3]').waitFor()
          await page.waitForTimeout(700)
          await page.screenshot({
            path: `${OUT}/${id || 'root'}-${levelName}-${themeName}-${device}.png`,
          })
        }
        await context.close()
      }
    })
