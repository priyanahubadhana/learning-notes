/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Pictures for gate 3, seventh visit, round 2 (Reader v2): the phone panel as
 * a full sheet (Pages and Annotations), the padlock menu, the notes panel
 * buttons, the pen bar, a toast over the Aa card and Settings with the
 * Preview pill. Day, Night, Sepia x phone, iPad landscape and portrait, PC.
 * Only with SHOTS=1; saved in screenshots/s7/v4/.
 */
const OUT = 'screenshots/s7/v4'
const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-land': { width: 1180, height: 820 },
  'ipad-port': { width: 820, height: 1180 },
  pc: { width: 1440, height: 900 },
} as const
const ON = ['reader.pagesTab', 'reader.inkLook']

const shots = process.env.SHOTS
  ? (['day', 'night', 'sepia'] as const).flatMap((theme) =>
      Object.entries(SIZES).map(([name, viewport]) => ({
        theme,
        name,
        viewport,
      })),
    )
  : []

const press = async (page: Page, id: string) => {
  await expect(page.getByTestId('reader-close')).toBeVisible()
  await page.waitForTimeout(300)
  const b = page.getByTestId(id)
  if (await b.isVisible()) return b.click()
  await page.getByTestId('reader-more').click()
  // A row in the More card, or the control itself placed there (the padlock).
  await page
    .getByTestId(id + '-card')
    .or(page.getByTestId('reader-more-card').getByTestId(id))
    .click()
}

for (const { theme, name, viewport } of shots)
  test(`shot v4 ${theme} ${name}`, async ({ browser }) => {
    const touch = name !== 'pc'
    const context = await browser.newContext({
      viewport,
      hasTouch: touch,
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
                value: JSON.stringify({ level: 'beginner', unlocked: ON }),
              },
            ],
          },
        ],
      },
    })
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const shot = async (what: string) => {
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${what}-${theme}-${name}.png` })
    }
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
    await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
    const hide = page.getByRole('button', { name: 'Hide menu' })
    if (await hide.isVisible()) await hide.click()
    // A highlight, so the notes panel has a row.
    await expect(async () => {
      await page.evaluate(() => {
        const span = document.querySelector('.textLayer span')!
        const range = document.createRange()
        range.selectNodeContents(span)
        const sel = window.getSelection()!
        sel.removeAllRanges()
        sel.addRange(range)
      })
      await expect(page.getByTestId('selection-popup')).toBeVisible({
        timeout: 1000,
      })
    }).toPass()
    await page.getByTestId('hl-yellow').click()
    await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
    // Fix 5: the panel (Pages, then Annotations); fix 7: the note buttons.
    await page.getByTestId('panel-toggle').click()
    await expect(page.getByTestId('left-panel')).toBeVisible()
    await shot('fix5-panel-pages')
    await page
      .getByTestId('left-panel')
      .getByRole('tab', { name: 'Notes' })
      .click()
    await expect(page.getByTestId('annotation-row').first()).toBeVisible()
    await shot('fix5-7-panel-notes')
    // Delete (an Undo toast follows), then close the panel.
    await page
      .getByTestId('annotation-row')
      .first()
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await page.getByRole('button', { name: 'Close panel' }).click()
    // Toast over the Aa card.
    await press(page, 'reader-aa')
    await page.getByTestId('aa-tab-more').click()
    await shot('toast-over-aa')
    await page.getByTestId('aa-close').click()
    // Fix 7: the padlock menu.
    await press(page, 'reader-lock')
    await expect(page.getByTestId('rv2-lock-menu')).toBeVisible()
    await shot('fix7-lock')
    await page.keyboard.press('Escape')
    // The pen bar (2 rows on iPad).
    await press(page, 'reader-ink')
    await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
    await shot('pen-bar')
    // Settings: the Preview pill docks right (phone).
    await page.goto('/?flags=settings.v3#/settings/pro')
    await expect(
      page.locator('[data-pro-feature="reader.liquid"]'),
    ).toBeVisible()
    await shot('settings-pro')
    await context.close()
  })
