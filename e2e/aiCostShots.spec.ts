// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Pictures of the Ask-this-book preview cost line, true count and "estimated",
 * for gate 3 (SHOTS=1). Not a test of behaviour.
 */
test.skip(!process.env.SHOTS, 'pictures only on request')
const OUT = process.env.SHOTS_OUT ?? 'screenshots/gate3-9-cost'
const SIZES = {
  phone: { width: 390, height: 844, touch: true },
  'ipad-landscape': { width: 1194, height: 834, touch: true },
  'ipad-portrait': { width: 820, height: 1180, touch: true },
  pc: { width: 1336, height: 800, touch: false },
} as const
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const
const LEVELS = ['beginner', 'professional'] as const
const STATES = ['true', 'estimated'] as const

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

for (const [dev, size] of Object.entries(SIZES))
  for (const [tn, theme] of Object.entries(THEMES))
    for (const level of LEVELS)
      test(`cost shots ${dev} ${tn} ${level}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          hasTouch: size.touch,
          isMobile: dev === 'phone',
          storageState: {
            cookies: [],
            origins: [
              {
                origin: new URL(`http://localhost:${process.env.PW_PORT}`)
                  .origin,
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
        let fail = false
        await page.route(
          'https://api.anthropic.com/v1/messages/count_tokens',
          (route) =>
            fail
              ? route.fulfill({ status: 500, body: '' })
              : route.fulfill({ json: { input_tokens: 1234 } }),
        )
        await page.goto('/?flags=ai.framework')
        await space(page, 'Library').click()
        await page.getByTestId('library-file').setInputFiles({
          name: 'b.pdf',
          mimeType: 'application/pdf',
          buffer: makePdf(
            ['Cells make energy in mitochondria', 'Plants use chloroplasts'],
            { title: 'Cell Book' },
          ),
        })
        await expect(page.getByTestId('source-card')).toBeVisible()
        await page.goto('/?flags=ai.framework#/settings/ai')
        await page.getByTestId('ai-enable').check()
        await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
        await page.getByTestId('ai-key-save').click()
        await expect(page.getByTestId('ai-key-masked')).toBeVisible()
        await page.goto('/?flags=ai.framework#/settings/permissions')
        const sw = page.getByRole('switch', { name: 'Allow AI in Books' })
        await sw.focus()
        await page.keyboard.press('Space')
        await expect(sw).toBeChecked()
        await space(page, 'Library').click()
        await page
          .getByTestId('source-card')
          .getByRole('button', { name: 'Cell Book' })
          .click()
        await page.getByTestId('book-continue').click()
        await expect(page.getByTestId('book-reader')).toBeVisible()
        await page.getByTestId('reader-ask').click()
        for (const state of STATES) {
          fail = state === 'estimated'
          await page
            .getByTestId('ask-book-question')
            .fill(`Where is energy made ${state}?`)
          await page.getByTestId('ask-book-prepare').click()
          await expect(page.getByTestId('ask-book-tokens')).toContainText(
            state === 'true' ? '1,234 tokens' : 'estimated',
          )
          await page
            .getByText('Added “Cell Book”')
            .waitFor({ state: 'detached', timeout: 20000 })
            .catch(() => undefined)
          await page.getByTestId('ask-book-preview').scrollIntoViewIfNeeded()
          await page.waitForTimeout(400)
          await page.screenshot({
            path: `${OUT}/cost-${state}-${dev}-${tn}-${level}.png`,
          })
        }
        await context.close()
      })
