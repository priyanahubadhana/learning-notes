/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Pictures of the parts new in slice 7g/7h: the Find field with its ✕, and the
 * Aa sheet with the Professional rows gated (Beginner) or shown (Professional).
 * Day, night and sepia. Only registered with SHOTS=1; saved in screenshots/s7/.
 */
const OUT = 'screenshots/s7'

const shots = process.env.SHOTS
  ? (['day', 'night', 'sepia'] as const).flatMap((theme) =>
      (['beginner', 'professional'] as const).map((level) => ({
        theme,
        level,
      })),
    )
  : []

for (const { theme, level } of shots)
  test(`shot find + aa ${level} ${theme}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1180, height: 820 },
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
    await page.goto('/?flags=reader.v2')
    await page
      .getByRole('navigation', { name: 'Spaces' })
      .getByRole('button', { name: 'Space: Library' })
      .click()
    await page.getByTestId('library-file').setInputFiles({
      name: 'fixture.pdf',
      mimeType: 'application/pdf',
      buffer: makePdf(
        Array.from({ length: 4 }, (_, i) => `Page ${i + 1} words here`),
        { title: 'Fixture Book' },
      ),
    })
    await page.getByRole('button', { name: 'Start reading' }).click()
    await expect(page.getByTestId('book-reader')).toBeVisible()
    await page.getByTestId('reader-find').click()
    await page.getByTestId('pdf-find-input').fill('page')
    await expect(page.getByTestId('pdf-find-clear')).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/7h-find-${level}-${theme}.png` })
    await page.keyboard.press('Escape')
    await page.getByTestId('reader-aa').click()
    await page.getByTestId('aa-tab-more').click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/7h-aa-more-${level}-${theme}.png` })
    await context.close()
  })
