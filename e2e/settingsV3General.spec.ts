// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 General previews: SET-B08, B32, B33, B34, B35. */

const V3 = '/?flags=settings.v3#/settings/general'
const row = (page: Page, id: string) =>
  page.locator(`[data-setting-id="${id}"]`)
const mini = (page: Page) => page.locator('[data-general-preview]:visible')

async function open(page: Page) {
  await page.goto(V3)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(row(page, 'general.theme')).toBeVisible()
  await expect(page.locator('[data-general-preview]')).toBeVisible()
}

test.describe('iPad landscape General previews', () => {
  test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })
  test.beforeEach(async ({ page }) => open(page))

  test('SET-B08 the General preview shows theme, glass, date, tips, paper and the rail', async ({
    page,
  }) => {
    // Theme
    await row(page, 'general.theme')
      .getByRole('radio', { name: 'Night' })
      .click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    await expect(page.locator('[data-preview-note]')).toContainText(
      'Theme: Day → Night',
    )
    // Reduce glass
    await row(page, 'general.reduceGlass')
      .getByRole('radio', { name: 'Solid' })
      .click()
    await expect(page.locator('.sv3-mini-bar')).toHaveAttribute(
      'data-solid',
      '',
    )
    // Date style
    await row(page, 'general.dateStyle')
      .getByRole('radio', { name: '27 Oct 2026' })
      .click()
    await expect(page.locator('.sv3-mini-date')).toHaveText('27 Oct 2026')
    await row(page, 'general.dateStyle')
      .getByRole('radio', { name: 'Oct 27, 2026' })
      .click()
    await expect(page.locator('.sv3-mini-date')).toHaveText('Oct 27, 2026')
    // Help tips
    await row(page, 'general.showHelp').getByRole('switch').uncheck()
    await expect(page.locator('.sv3-mini-tip')).toHaveAttribute('data-off', '')
    // Paper
    await row(page, 'general.defaultPaper')
      .getByRole('radio', { name: 'Grid' })
      .click()
    await expect(page.locator('.sv3-mini-page')).toHaveAttribute(
      'data-paper',
      'grid',
    )
    // The part that changed glows.
    await expect(page.locator('.sv3-mini-page')).toHaveAttribute(
      'data-glow',
      'on',
    )
  })

  test('SET-B27 Show help off greys the tips line, glows and writes a before / after note', async ({
    page,
  }) => {
    await row(page, 'general.showHelp').getByRole('switch').uncheck()
    const tip = page.locator('.sv3-mini-tip:visible')
    await expect(tip).toHaveAttribute('data-off', '')
    await expect(tip).toHaveAttribute('data-glow', 'on')
    await expect(page.locator('[data-preview-note]:visible')).toContainText(
      'Show help: On → Off',
    )
  })

  test('SET-B08 the update chip and the rail follow the settings', async ({
    page,
  }) => {
    await expect(page.locator('[data-update]')).toHaveCount(0)
    await row(page, 'general.autoUpdate').getByRole('switch').uncheck()
    await expect(page.locator('[data-update]')).toBeVisible()
    await row(page, 'general.space.home')
      .getByRole('radio', { name: 'Hide' })
      .click()
    await expect(page.locator('[data-rail-space="home"]')).toHaveCount(0)
    await expect(page.locator('[data-rail-space="library"]')).toHaveCount(1)
  })

  test('SET-B32 Reduce glass: Solid makes the bars solid, Automatic brings frosted back', async ({
    page,
  }) => {
    const r = row(page, 'general.reduceGlass')
    await r.getByRole('radio', { name: 'Solid' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-glass', 'lite')
    await expect(r.locator('[data-glass-preview]')).toHaveAttribute(
      'data-mode',
      'solid',
    )
    await expect(r.locator('.sv3-glass-bar')).toHaveCount(1)
    await r.getByRole('radio', { name: 'Automatic' }).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-glass', 'lite')
    await expect(r.locator('[data-glass-preview]')).toHaveAttribute(
      'data-mode',
      'auto',
    )
  })

  test('SET-B33 Automatic shows a split, frosted and solid, with a plain line', async ({
    page,
  }) => {
    const r = row(page, 'general.reduceGlass')
    await expect(r.locator('.sv3-glass-bar')).toHaveCount(2)
    await expect(r.locator('.sv3-glass-bar[data-kind="frosted"]')).toHaveCSS(
      'backdrop-filter',
      /blur/,
    )
    await expect(r.locator('.sv3-glass-bar[data-kind="solid"]')).toHaveCSS(
      'backdrop-filter',
      'none',
    )
    await expect(r.locator('[data-glass-preview]')).toContainText(
      'Turns blur off if the device gets slow',
    )
  })

  test('SET-B34 the Bold, Pen, Read card is calm, in theme colours and follows the language', async ({
    page,
  }) => {
    const card = row(page, 'general.language').locator('[data-lang-card]')
    await expect(card.locator('.sv3-lang-label')).toHaveText([
      'Bold',
      'Pen',
      'Read',
    ])
    // Same radius as the other previews, the shared shadow, token colours.
    const same = await page.evaluate(() => {
      const c = document.querySelector('[data-lang-card]') as HTMLElement
      const p = document.querySelector('.sv3-rowprev') as HTMLElement
      const probe = document.createElement('div')
      probe.style.background = 'var(--color-surface-0)'
      probe.style.boxShadow = 'var(--elev-1)'
      document.body.appendChild(probe)
      const want = getComputedStyle(probe)
      const got = getComputedStyle(c)
      const out = {
        radius: got.borderRadius === getComputedStyle(p).borderRadius,
        bg: got.backgroundColor === want.backgroundColor,
        shadow: got.boxShadow === want.boxShadow,
      }
      probe.remove()
      return out
    })
    expect(same).toEqual({ radius: true, bg: true, shadow: true })
    // The words follow the chosen language.
    await row(page, 'general.language')
      .getByRole('radio', { name: 'Español' })
      .click()
    await expect(
      row(page, 'general.language').locator('.sv3-lang-label'),
    ).toHaveText(['Negrita', 'Lápiz', 'Leer'])
  })

  test('SET-B35 each space is Show / Hide, and one always stays', async ({
    page,
  }) => {
    for (const s of ['home', 'library', 'review'])
      await row(page, `general.space.${s}`)
        .getByRole('radio', { name: 'Hide' })
        .click()
    await expect(page.locator('[data-rail-space]')).toHaveCount(1)
    await expect(page.locator('[data-rail-space="notebooks"]')).toHaveCount(1)
    await expect(page.locator('[data-space="notebooks"]').first()).toBeVisible()
    for (const s of ['home', 'library', 'review'])
      await expect(
        row(page, `general.space.${s}`).getByRole('radio', { name: 'Hide' }),
      ).toHaveCount(1)
  })
})

test.describe('phone General preview', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })

  test('SET-B08 on a phone the preview is in the sheet and shows the change', async ({
    page,
  }) => {
    await page.goto(V3)
    await row(page, 'general.dateStyle')
      .getByRole('radio', { name: '27 Oct 2026' })
      .tap()
    await page.locator('[data-preview-pill]').tap()
    await expect(mini(page)).toBeVisible()
    await expect(mini(page).locator('.sv3-mini-date')).toHaveText('27 Oct 2026')
  })
})
