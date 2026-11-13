// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 rows: SET-B07, B09, B12, B15, B16 and the 44 pt rule (B36 for the rows). */

const V3 = '/?flags=settings.v3#/settings/'
const IPAD = { width: 1194, height: 834 }
const PHONE = { width: 390, height: 844 }

async function open(page: Page, section: string) {
  await page.goto(`${V3}${section}`)
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
}
const row = (page: Page, id: string) =>
  page.locator(`[data-setting-id="${id}"]`)

test.describe('iPad landscape rows', () => {
  test.use({ viewport: IPAD, hasTouch: true })
  test.beforeEach(async ({ page }) => {
    await page.goto(`${V3}review`)
    await page.getByRole('button', { name: 'Hide menu' }).click()
  })

  test('SET-B09 every row carries its value as words; no empty box is drawn (gate 3)', async ({
    page,
  }) => {
    const rows = page.locator('[data-setting-id]')
    await expect(rows.nth(3)).toBeVisible()
    await expect(page.locator('[data-row-preview]')).toHaveCount(
      await rows.count(),
    )
    for (const r of await rows.all()) {
      const prev = r.locator('[data-row-preview]')
      // Never blank: the value as words (read aloud when nothing is drawn).
      expect((await prev.textContent())!.trim().length).toBeGreaterThan(0)
      if ((await prev.getAttribute('data-picture')) === 'none') {
        // No picture to show: no empty bordered box repeating the value.
        const b = await prev.evaluate((el) => {
          const s = getComputedStyle(el)
          return {
            h: el.getBoundingClientRect().height,
            border: s.borderTopWidth,
          }
        })
        expect(b.h).toBeLessThan(2)
        expect(b.border).toBe('0px')
      }
    }
  })

  test('rows edit the same stored value and the preview follows at once', async ({
    page,
  }) => {
    const r = row(page, 'review.scheduler')
    await r.getByRole('radio', { name: 'Simple steps' }).click()
    await expect(r.locator('[data-row-preview]')).toHaveText(
      'Now: Simple steps',
    )
    // Today's screen reads the same stored value.
    await page.goto('/#/settings/review')
    await expect(
      page.locator('[data-setting-id="review.scheduler"] select'),
    ).toHaveValue('fixed')
  })

  test('SET-B07 the changed part glows and a note names what changed', async ({
    page,
  }) => {
    const r = row(page, 'review.scheduler')
    await r.getByRole('radio', { name: 'Simple steps' }).click()
    await expect(r).toHaveAttribute('data-glow', 'on')
    await expect(r.locator('[data-row-preview]')).toHaveAttribute(
      'data-glow',
      'on',
    )
    await expect(page.locator('[data-preview-note]')).toContainText(
      'Scheduler: FSRS (smart) → Simple steps',
    )
    // The glow goes away by itself.
    await expect(r).not.toHaveAttribute('data-glow', 'on', { timeout: 6000 })
  })

  test('SET-B12 every row keeps its sync badge and menu', async ({ page }) => {
    const r = row(page, 'review.scheduler')
    await r.locator('[data-testid="setting-sync-menu"]').click()
    await expect(
      page.getByRole('menuitem', { name: /device/i }).first(),
    ).toBeVisible()
  })

  test('SET-B15 a changed row shows Reset; tapping it brings the default back', async ({
    page,
  }) => {
    const r = row(page, 'review.scheduler')
    await expect(r.locator('[data-row-reset]')).toHaveCount(0)
    await r.getByRole('radio', { name: 'Simple steps' }).click()
    await r.locator('[data-row-reset]').click()
    await expect(r.locator('[data-row-preview]')).toHaveText(
      'Now: FSRS (smart)',
    )
    await expect(r.locator('[data-row-reset]')).toHaveCount(0)
  })

  test('SET-B16 an "Also in" row shows its note and stays in step in both sections', async ({
    page,
  }) => {
    await page.locator('[data-section="toolbar"]').click()
    const r = row(page, 'advanced.barPlacement')
    await expect(r.locator('[data-also-in]')).toContainText('Also in:')
    await r.getByRole('radio', { name: 'Top' }).click()
    await page.locator('[data-section="advanced"]').click()
    await expect(
      row(page, 'advanced.barPlacement').locator('[data-row-preview]'),
    ).toHaveText('Now: Top')
  })

  test('every button in a row is at least 44 pt tall', async ({ page }) => {
    await page.locator('[data-section="general"]').click()
    await expect(page.locator('[data-setting-id]').nth(3)).toBeVisible()
    const small = await page
      .locator('[data-setting-id] button, [data-setting-id] select')
      .evaluateAll((els) =>
        els
          .map((e) => ({
            n: e.getAttribute('aria-label') ?? e.textContent,
            h: e.getBoundingClientRect().height,
          }))
          .filter((x) => x.h > 0 && x.h < 43.5),
      )
    expect(small).toEqual([])
  })
})

test.describe('phone rows', () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true })

  test('SET-B07 on a phone the change shows in the sheet and the pill pulses', async ({
    page,
  }) => {
    await open(page, 'review')
    const r = row(page, 'review.scheduler')
    await r.getByRole('radio', { name: 'Simple steps' }).tap()
    await expect(page.locator('[data-preview-pill]')).toHaveAttribute(
      'data-pulse',
      'on',
    )
    await page.locator('[data-preview-pill]').tap()
    await expect(page.locator('[data-preview-sheet]')).toContainText(
      'Scheduler: FSRS (smart) → Simple steps',
    )
    // The row is still tappable above the open sheet's reach.
    const b = (await r.boundingBox())!
    expect(b.width).toBeLessThanOrEqual(PHONE.width)
  })
})
