/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'
import { mockSpeech } from './readingHelpers.ts'

/**
 * Pictures of Listen (button + settings card) for review against the mock:
 * Beginner / Professional x Day / Night x iPad / phone. Only with SHOTS=1.
 */
const OUT = 'docs/mockups/reader-v2-build-shots'
const SIZES = {
  ipad: { width: 1180, height: 820 },
  phone: { width: 390, height: 844 },
} as const
const VOICES = [
  {
    voiceURI: 'v-zoe',
    name: 'Zoe (Premium)',
    lang: 'en-US',
    localService: true,
  },
  {
    voiceURI: 'v-alex',
    name: 'Alex (Enhanced)',
    lang: 'en-US',
    localService: true,
  },
  { voiceURI: 'v-daniel', name: 'Daniel', lang: 'en-GB', localService: true },
  { voiceURI: 'v-sam', name: 'Samantha', lang: 'en-US', localService: true },
  { voiceURI: 'v-amelie', name: 'Amelie', lang: 'fr-FR', localService: true },
]

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
                origin: `http://localhost:${process.env.PW_PORT}`,
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
        await mockSpeech(page, 40, VOICES)
        await page.goto('/?flags=reader.v2')
        const menu = page.getByRole('button', { name: 'Open menu' })
        if (await menu.isVisible()) await menu.click()
        await page
          .getByRole('navigation', { name: 'Spaces' })
          .getByRole('button', { name: 'Space: Library' })
          .click()
        await page.getByTestId('library-file').setInputFiles({
          name: 'fixture.pdf',
          mimeType: 'application/pdf',
          buffer: makePdf(
            Array.from({ length: 6 }, (_, i) => `Page ${i + 1} words here`),
            { title: 'Fixture Book' },
          ),
        })
        await page.getByRole('button', { name: 'Start reading' }).click()
        await expect(page.getByTestId('book-reader')).toBeVisible()
        const listen = page.getByTestId('reader-listen')
        if (name === 'phone' && !(await listen.isVisible())) {
          await page.getByTestId('reader-more').click()
          await page.getByTestId('reader-listen-settings').click()
        } else {
          const b = await listen.boundingBox()
          await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2)
          await page.mouse.down()
        }
        await expect(page.getByTestId('rv2-listen-card')).toBeVisible()
        await page.mouse.up()
        await page.screenshot({
          path: `${OUT}/7b-listen-${level}-${theme}-${name}.png`,
        })
        await context.close()
      })
