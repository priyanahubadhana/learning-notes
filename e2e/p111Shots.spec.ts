/// <reference lib="dom" />
import { test, expect } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/** P1.11 first-look pictures. Runs only with SHOTS=1 (not part of the suites). */
const OUT = 'docs/screens/p1-11'
const SIZES = {
  'ipad-up': { width: 820, height: 1180 },
  'ipad-side': { width: 1180, height: 820 },
  phone: { width: 390, height: 844 },
} as const

test.skip(!process.env.SHOTS, 'pictures only on request')
test.setTimeout(120_000)

for (const [dev, size] of Object.entries(SIZES))
  for (const theme of ['day', 'night'] as const)
    test(`offline note ${dev} ${theme}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: size,
        hasTouch: true,
        storageState: {
          cookies: [],
          origins: [
            {
              origin: `http://localhost:${process.env.PW_PORT ?? 5199}`,
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
      await page.route('**/precache.json*', (r) =>
        r.fulfill({ json: { files: [] } }),
      )
      await page.goto('/?flags=update.v2')
      await createNotebook(page, 'Test NB', 'First page')
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent('learning-notes:test-required-update', {
            detail: null,
          }),
        ),
      )
      await expect(page.locator('[data-mandatory-update]')).toHaveAttribute(
        'data-phase',
        'countdown',
      )
      await context.setOffline(true)
      await expect(page.locator('[data-mandatory-update]')).toHaveAttribute(
        'data-phase',
        'offline',
      )
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${OUT}/offline-${theme}-${dev}.png` })
      await context.close()
    })

test('page menu in Pencil mode, no key names', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: SIZES['ipad-side'],
    hasTouch: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${process.env.PW_PORT ?? 5199}`,
          localStorage: [
            { name: 'learning-notes:devicePicker.done', value: 'true' },
            { name: 'learning-notes:onboarding.done', value: 'true' },
            { name: 'learning-notes:accountGate.off', value: '1' },
            { name: 'learning-notes:general.deviceMode', value: '"pencil"' },
          ],
        },
      ],
    },
  })
  const page = await context.newPage()
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(page.getByRole('menu').first()).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/page-menu-pencil-ipad-side.png` })
  await context.close()
})
