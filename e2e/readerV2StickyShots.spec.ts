/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Pictures of sticky notes (edit dialog, page with a note, read view) for
 * review against the mock: Beginner / Professional x Day / Night x iPad /
 * phone. Only registered with SHOTS=1.
 */
const OUT = 'docs/mockups/reader-v2-build-shots'
const SIZES = {
  ipad: { width: 1180, height: 820 },
  phone: { width: 390, height: 844 },
} as const

const shots = process.env.SHOTS
  ? (['beginner', 'professional'] as const).flatMap((level) =>
      (['day', 'night'] as const).flatMap((theme) =>
        Object.entries(SIZES).map(([name, viewport]) => ({
          level,
          theme,
          name,
          viewport,
        })),
      ),
    )
  : []

for (const { level, theme, name, viewport } of shots)
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
        Array.from({ length: 4 }, (_, i) => `Page ${i + 1} words here`),
        { title: 'Fixture Book' },
      ),
    })
    await page.getByRole('button', { name: 'Start reading' }).click()
    await expect(page.getByTestId('book-reader')).toBeVisible()
    await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
    // Pen bar with the Sticky tool armed, then a note placed.
    await page.getByTestId('reader-ink').click()
    await page.getByTestId('reader-ink-sticky').click()
    const b = (await page.locator('[data-pdf-page="1"]').boundingBox())!
    await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.35)
    const edit = page.getByTestId('rv2-sticky-edit-dialog')
    await expect(edit).toBeVisible()
    await page
      .getByTestId('rv2-sticky-text-input')
      .fill('Check the second example before Friday.\nAsk about the units.')
    await page.screenshot({
      path: `${OUT}/7c-edit-${level}-${theme}-${name}.png`,
    })
    await page.getByTestId('rv2-sticky-save').click()
    await expect(edit).toHaveCount(0)
    await expect(page.getByTestId('rv2-sticky-pin')).toBeVisible()
    await page.screenshot({
      path: `${OUT}/7c-page-${level}-${theme}-${name}.png`,
    })
    await page.getByTestId('rv2-sticky-pin').click()
    await expect(page.getByTestId('rv2-sticky-read')).toBeVisible()
    await page.screenshot({
      path: `${OUT}/7c-read-${level}-${theme}-${name}.png`,
    })
    await context.close()
  })
