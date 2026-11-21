// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * P1.8 first look: every stage of the must-have update screens in light and
 * dark, Beginner and Professional, iPad upright, iPad sideways and phone.
 * Files: docs/mockups/p1-update-shots/<stage>-<theme>-<level>-<device>.png
 * Only with SHOTS=1.
 */
const OUT = 'docs/mockups/p1-update-shots'
const SIZES = {
  'ipad-upright': { width: 834, height: 1194 },
  'ipad-sideways': { width: 1194, height: 834 },
  phone: { width: 390, height: 844 },
} as const
const THEMES = { light: 'day', dark: 'night' } as const
const LEVELS = {
  beginner: { level: 'beginner', unlocked: [], off: [] },
  professional: { level: 'professional', unlocked: [], off: [] },
} as const

// test-guard-reason: picture files are made only on request, like other shots
test.skip(!process.env.SHOTS, 'pictures only on request')
// test-guard-reason: many pictures per test, only run on request
test.setTimeout(180_000)

const notice = (page: Page) => page.locator('[data-mandatory-update]')
const pretend = (page: Page) =>
  page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('learning-notes:test-required-update'),
    ),
  )
const phase = (p: Page, name: string, timeout = 14_000) =>
  expect(notice(p)).toHaveAttribute('data-phase', name, { timeout })

async function route(page: Page, kind: 'gated' | 'failing' | 'empty') {
  const files =
    kind === 'gated'
      ? [{ u: '/__scr.bin', s: 3_400_000 }]
      : kind === 'failing'
        ? [{ u: '/__scr-bad.bin', s: 1000 }]
        : []
  await page.route('**/precache.json*', (r) => r.fulfill({ json: { files } }))
  await page.route('**/__scr.bin', () => new Promise<void>(() => {}))
  await page.route('**/__scr-bad.bin', (r) => r.fulfill({ status: 404 }))
}

for (const [themeName, theme] of Object.entries(THEMES))
  for (const [levelName, level] of Object.entries(LEVELS))
    for (const [device, viewport] of Object.entries(SIZES))
      test(`update shots ${themeName} ${levelName} ${device}`, async ({
        browser,
      }) => {
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
                    name: 'learning-notes:toolbar.lastToolOffered',
                    value: 'true',
                  },
                  {
                    name: 'learning-notes:theme',
                    value: JSON.stringify(theme),
                  },
                  {
                    name: 'learning-notes:level',
                    value: JSON.stringify(level),
                  },
                ],
              },
            ],
          },
        })
        const shot = async (page: Page, stage: string) => {
          await page.waitForTimeout(450)
          // A "dark" picture must really be dark.
          expect(
            await page.evaluate(() => document.documentElement.dataset.theme),
          ).toBe(theme)
          await page.screenshot({
            path: `${OUT}/${stage}-${themeName}-${levelName}-${device}.png`,
          })
        }
        const fresh = async (kind: 'gated' | 'failing' | 'empty') => {
          const page = await context.newPage()
          await route(page, kind)
          await page.goto('/?flags=update.v2')
          await expect(page.locator('#root > *').first()).toBeAttached()
          await page.waitForTimeout(800)
          await pretend(page)
          return page
        }

        let page = await fresh('gated')
        await phase(page, 'countdown')
        await shot(page, '1-countdown')
        await notice(page).getByRole('button', { name: 'Update now' }).click()
        await phase(page, 'downloading')
        await page.waitForTimeout(3500)
        await shot(page, '2-downloading')
        await page.waitForTimeout(6500)
        await expect(page.locator('[data-update-slow]')).toBeVisible()
        await shot(page, '2b-slow')
        await notice(page).getByRole('button', { name: 'Cancel' }).click()
        await phase(page, 'paused')
        await shot(page, '6-paused')
        await page.close()

        page = await fresh('gated')
        await phase(page, 'countdown')
        await context.setOffline(true)
        await phase(page, 'offline')
        await shot(page, '5-offline')
        await context.setOffline(false)
        await page.close()

        page = await fresh('empty')
        await phase(page, 'installing')
        await shot(page, '3-installing')
        await page.close()

        page = await fresh('failing')
        await phase(page, 'failed')
        await shot(page, '4-failed')
        await notice(page).getByRole('button', { name: 'Not now' }).click()
        await expect(page.locator('[data-update-waiting]')).toBeVisible()
        await shot(page, '4b-after-not-now')
        await context.close()
      })
