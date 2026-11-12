/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Pictures for the gate 3 fix list of Reader v2: the bar with a long title,
 * the minimised chips, the More card and the toast over the tab bar, in Day,
 * Night and Sepia on iPad and phone. Only registered with SHOTS=1.
 */
const OUT = 'docs/mockups/reader-v2-build-shots'
const SIZES = {
  'ipad-land': { width: 1180, height: 820 },
  'ipad-port': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
} as const

const shots = process.env.SHOTS
  ? (['day', 'night', 'sepia'] as const).flatMap((theme) =>
      Object.entries(SIZES).map(([name, viewport]) => ({
        theme,
        name,
        viewport,
      })),
    )
  : []

for (const { theme, name, viewport } of shots)
  test(`fix shot ${theme} ${name}`, async ({ browser }) => {
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
                value: JSON.stringify({ level: 'professional', unlocked: [] }),
              },
            ],
          },
        ],
      },
    })
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
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
        { title: 'A Short History of Nearly Everything' },
      ),
    })
    // The toast sits above the tab bar on a phone.
    await page.waitForTimeout(500)
    if (name === 'phone')
      await page.screenshot({ path: `${OUT}/7x-toast-${theme}-${name}.png` })
    await page.getByRole('button', { name: 'Start reading' }).click()
    await expect(page.getByTestId('book-reader')).toBeVisible()
    await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
    const hide = page.getByRole('button', { name: 'Hide menu' })
    if (await hide.isVisible()) await hide.click()
    await page.getByTestId('reader-ink').click()
    await expect(page.getByTestId('rv2-draw-bar')).toBeVisible()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/7x-bar-${theme}-${name}.png` })
    await page.getByTestId('reader-more').click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/7x-more-${theme}-${name}.png` })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Hide drawing bar' }).click()
    await page.getByRole('button', { name: 'Hide reader bar' }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/7x-chips-${theme}-${name}.png` })
    await context.close()
  })
