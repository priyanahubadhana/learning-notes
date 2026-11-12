/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Pictures of the Pages grid (grid, after an edit, Restore original question) for
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
    const hide = page.getByRole('button', { name: 'Hide menu' })
    if (await hide.isVisible()) await hide.click()
    await page.getByTestId('panel-toggle').click()
    await expect(page.getByTestId('pg-list')).toBeVisible()
    await expect(page.getByTestId('book-thumb')).toHaveCount(4)
    // Let the page pictures draw.
    await page.waitForTimeout(900)
    await page.screenshot({
      path: `${OUT}/7f-grid-${level}-${theme}-${name}.png`,
    })
    // One edit, then the restore question.
    await page.locator('[data-testid="book-thumb"][data-page="2"]').click()
    await page.getByTestId('pg-delete').click()
    await expect(page.getByTestId('pg-restore')).toBeVisible()
    await page.waitForTimeout(900)
    await page.screenshot({
      path: `${OUT}/7f-edited-${level}-${theme}-${name}.png`,
    })
    await page.getByTestId('pg-restore').click()
    await expect(page.getByTestId('pg-restore-dialog')).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: `${OUT}/7f-restore-${level}-${theme}-${name}.png`,
    })
    await context.close()
  })
