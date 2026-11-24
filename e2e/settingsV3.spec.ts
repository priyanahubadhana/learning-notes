// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * Settings v3 (flag settings.v3), sub-slices 1 to 3: the flag, the shell, the
 * section list and the Preview pill. SET-B01 to B04 and the lazy part of B47.
 */

const V3 = '/?flags=settings.v3#/settings/general'
const IPAD = { width: 1194, height: 834 } // iPad Pro 11 landscape
const IPAD_PORTRAIT = { width: 834, height: 1194 }
const PHONE = { width: 390, height: 844 }

const box = async (page: Page, sel: string) => {
  const b = await page.locator(sel).first().boundingBox()
  if (!b) throw new Error(`no box for ${sel}`)
  return b
}

test.describe('flag', () => {
  test('SET-B47 OFF: today’s screen shows and nothing of v3 downloads', async ({
    page,
  }) => {
    const asked: string[] = []
    page.on('request', (r) => asked.push(r.url()))
    await page.goto('/#/settings/general')
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByRole('group', { name: 'Reduce glass' }),
    ).toBeVisible()
    await expect(page.locator('[data-settings-v3]')).toHaveCount(0)
    expect(asked.filter((u) => /SettingsV3|settingsV3/.test(u))).toEqual([])
  })

  test('SET-B47 ON: the v3 screen loads as its own chunk', async ({ page }) => {
    const asked: string[] = []
    page.on('request', (r) => asked.push(r.url()))
    await page.goto(V3)
    await expect(page.locator('[data-settings-v3]')).toBeVisible()
    expect(asked.some((u) => /SettingsV3/.test(u))).toBe(true)
  })
})

test.describe('iPad landscape (touch)', () => {
  test.use({ viewport: IPAD, hasTouch: true })

  test('SET-B01 list left, settings middle, 340 px sticky preview right', async ({
    page,
  }) => {
    await page.goto(V3)
    // The side menu takes room: hide it, as on the owner's iPad in Settings.
    await page.getByRole('button', { name: 'Hide menu' }).click()
    await expect(page.locator('[data-settings-v3]')).toBeVisible()
    const list = await box(page, '.sv3-sections')
    const main = await box(page, '.sv3-main')
    const prev = await box(page, '[data-preview-pane]')
    expect(list.x + list.width).toBeLessThanOrEqual(main.x)
    // Settings are never covered by the preview.
    expect(main.x + main.width).toBeLessThanOrEqual(prev.x + 0.5)
    expect(Math.round(prev.width)).toBe(340)
    await expect(page.locator('[data-preview-pane]')).toHaveCSS(
      'position',
      'sticky',
    )
    await expect(page.locator('[data-preview-pill]')).toBeHidden()
  })

  test('with the side menu open the preview is the pill, never a squeezed column', async ({
    page,
  }) => {
    await page.goto(V3)
    await expect(page.locator('[data-settings-v3]')).toBeVisible()
    await expect(page.locator('[data-preview-pane]')).toBeHidden()
    await expect(page.locator('[data-preview-pill]')).toBeVisible()
    const main = await box(page, '.sv3-main')
    expect(main.width).toBeGreaterThan(380)
  })

  test('the sections show the same settings as today’s screen', async ({
    page,
  }) => {
    await page.goto('/#/settings/general')
    const oldTab = page.locator('nav button[aria-label^="General,"]')
    await expect(oldTab).toBeVisible()
    const oldGeneral = await oldTab.getAttribute('aria-label')
    await page.goto(V3)
    const general = page.locator('[data-section="general"]')
    await expect(general).toHaveAttribute('aria-current', 'page')
    expect(await general.getAttribute('aria-label')).toBe(oldGeneral)
  })

  test('a section opens its settings from the registry', async ({ page }) => {
    await page.goto(V3)
    await page.locator('[data-section="review"]').click()
    await expect(
      page.locator('[data-setting-id="review.scheduler"]'),
    ).toContainText('Scheduler')
    await expect(
      page.locator('[data-setting-id="review.scheduler"] [data-row-preview]'),
    ).toHaveText('Now: FSRS (smart)')
  })
})

test.describe('iPad portrait (touch)', () => {
  test.use({ viewport: IPAD_PORTRAIT, hasTouch: true })

  test('two columns and the pill (no preview column)', async ({ page }) => {
    await page.goto(V3)
    await expect(page.locator('[data-preview-pane]')).toBeHidden()
    await expect(page.locator('[data-preview-pill]')).toBeVisible()
    const list = await box(page, '.sv3-sections')
    const main = await box(page, '.sv3-main')
    expect(list.x + list.width).toBeLessThanOrEqual(main.x)
  })
})

test.describe('phone', () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true })

  test('SET-B02 sections are a chip row; no preview column; a 44 pt pill', async ({
    page,
  }) => {
    await page.goto(V3)
    await expect(page.locator('[data-settings-v3]')).toBeVisible()
    const chips = page.locator('.sv3-section')
    expect(await chips.count()).toBeGreaterThan(3)
    const first = (await chips.nth(0).boundingBox())!
    const second = (await chips.nth(1).boundingBox())!
    expect(Math.abs(first.y - second.y)).toBeLessThan(2) // one row
    expect(first.height).toBeGreaterThanOrEqual(44)
    await expect(page.locator('[data-preview-pane]')).toBeHidden()
    const pill = await box(page, '[data-preview-pill]')
    expect(pill.height).toBeGreaterThanOrEqual(44)
    // Above the tab bar (56 px) at the bottom.
    expect(pill.y + pill.height).toBeLessThanOrEqual(PHONE.height - 56)
    expect(pill.y + pill.height).toBeGreaterThan(PHONE.height - 140)
  })

  test('SET-B03 the pill opens a sheet; the pill, the X and Esc close it', async ({
    page,
  }) => {
    await page.goto(V3)
    const pill = page.locator('[data-preview-pill]')
    const sheet = page.locator('[data-preview-sheet]')
    await expect(sheet).toHaveCount(0)

    await pill.tap()
    await expect(sheet).toBeVisible()
    const s = await box(page, '[data-preview-sheet]')
    expect(s.height).toBeLessThanOrEqual(PHONE.height * 0.46 + 1)
    // Above the pill, so the pill is never covered.
    const p = await box(page, '[data-preview-pill]')
    expect(s.y + s.height).toBeLessThanOrEqual(p.y)

    // Settings behind it stay tappable.
    await page.locator('[data-section="review"]').tap()
    await expect(page.locator('[data-section="review"]')).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(sheet).toBeVisible()

    await pill.tap()
    await expect(sheet).toHaveCount(0)

    await pill.tap()
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Close preview' }).tap()
    await expect(sheet).toHaveCount(0)

    await pill.tap()
    await expect(sheet).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
  })

  test('SET-B04 the pill pulses when a setting changes while the preview is shut', async ({
    page,
    context,
  }) => {
    await page.goto('/?flags=settings.v3#/settings/review')
    await expect(
      page.locator('[data-setting-id="review.scheduler"] [data-row-preview]'),
    ).toHaveText('Now: FSRS (smart)')
    const pill = page.locator('[data-preview-pill]')
    await expect(pill).not.toHaveAttribute('data-pulse', 'on')

    // The same notes opened in a second window (today’s screen) change it.
    const other = await context.newPage()
    await other.setViewportSize({ width: 1200, height: 800 })
    await other.goto('/#/settings/review')
    await other
      .locator('[data-setting-id="review.scheduler"] select')
      .selectOption({ label: 'Simple steps' })

    await expect(
      page.locator('[data-setting-id="review.scheduler"] [data-row-preview]'),
    ).toHaveText('Now: Simple steps')
    await expect(pill).toHaveAttribute('data-pulse', 'on')
    await expect(page.locator('[role="status"].sr-only')).toContainText(
      'A setting changed',
    )

    // Opening the preview shows the change and stops the pulse.
    await pill.tap()
    await page.keyboard.press('Escape')
    await expect(pill).not.toHaveAttribute('data-pulse', 'on')
  })
})
