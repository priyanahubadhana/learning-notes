/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Pictures of "Highlight where I land" (the Aa switch and the glow after a jump) for
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
    // On a phone a button may sit in the ⋯ card (its id gets -card).
    const press = async (id: string) => {
      const b = page.getByTestId(id)
      if (await b.isVisible()) return b.click()
      await page.getByTestId('reader-more').click()
      await page.getByTestId(id + '-card').click()
    }
    // The switch, in Aa > More.
    await press('reader-aa')
    await page.getByTestId('aa-tab-more').click()
    await expect(page.getByTestId('aa-land-glow')).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: `${OUT}/7e-switch-${level}-${theme}-${name}.png`,
    })
    await page.getByTestId('aa-close').click()
    // The glow: bookmark page 3, go back, jump from the Notes list.
    await press('panel-toggle')
    await page.getByTestId('book-thumb').nth(2).click()
    await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 4')
    await press('reader-ribbon')
    await page.getByTestId('book-thumb').nth(0).click()
    await page
      .getByTestId('left-panel')
      .getByRole('tab', { name: 'Notes' })
      // On a phone the reader bar floats over the panel tabs (leftover, reported).
      .dispatchEvent('click')
    await page.getByTestId('annotation-row').getByRole('button').first().click()
    await expect(page.getByTestId('pdf-land-glow')).toBeAttached()
    await page.screenshot({
      path: `${OUT}/7e-glow-${level}-${theme}-${name}.png`,
    })
    await context.close()
  })
