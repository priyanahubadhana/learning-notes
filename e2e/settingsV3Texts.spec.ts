// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 text fields, pop-ups and languages: SET-B45, B46, B47, B48. */

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

async function open(page: Page, section = 'general') {
  await page.goto(`/?flags=settings.v3#/settings/${section}`)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
}

const FIELDS =
  'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=button]), textarea'

test('SET-B45 every text field in Settings has a ✕ of 44 pt and clears it', async ({
  page,
}) => {
  await open(page)
  const sections = await page
    .locator('[data-section]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-section')!))
  let seen = 0
  for (const id of sections) {
    await page.locator(`[data-section="${id}"]`).click()
    // Rows load from the database a moment after the section opens.
    await page
      .locator('.sv3-main .sv3-row')
      .first()
      .waitFor({ timeout: 2000 })
      .catch(() => {})
    await page.waitForTimeout(400)
    // Fields inside today's own screens (.sv3-area: keys, passphrases) are not rows.
    const fields = page
      .locator(`.sv3-main ${FIELDS}`)
      .and(page.locator(':not(.sv3-area *)'))
    const n = await fields.count()
    for (let i = 0; i < n; i++) {
      const field = fields.nth(i)
      if (!(await field.isVisible())) continue
      seen++
      // Every field is a shared ✕ field.
      await expect(field, `${id} field ${i}`).toHaveClass(/clr-field/)
      await field.fill('1')
      const btn = field.locator('xpath=following-sibling::button[1]')
      await expect(btn).toBeVisible()
      const box = await btn.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      await btn.click()
      await expect(field).toHaveValue('')
      // Put a valid value back so the row is not left in an error state.
      await field.press('Escape').catch(() => {})
    }
  }
  // The search box, the number fields and the review steps were all met.
  expect(seen).toBeGreaterThan(5)
  // The page's own search and the feature search have it too.
  await page.locator('[data-section="pro"]').click()
  await page.getByRole('searchbox', { name: 'Search features' }).fill('x')
  await expect(
    page.locator('[data-pro-top]').getByRole('button', { name: /clear/i }),
  ).toBeVisible()
})

test('SET-B46 the ? on a row opens a pop-up with the plain explanation; Esc, ✕ and a tap outside close it; the row stays', async ({
  page,
}) => {
  await open(page)
  const row = page.locator('[data-setting-id="general.showHelp"]')
  const ask = row.locator('[data-why="general.showHelp"]')
  await expect(ask).toBeVisible()
  const box = await ask.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  await ask.click()
  const popup = page.getByTestId('sv3-why-popup')
  await expect(popup).toBeVisible()
  // The pop-up carries the row's own plain words.
  await expect(popup).toContainText(
    (await row.locator('.sv3-line-help').first().innerText()).trim(),
  )
  // The row is still there and was not replaced.
  await expect(row.getByRole('radiogroup')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  await ask.click()
  await page.getByTestId('sheet-close').click()
  await expect(popup).toHaveCount(0)
  await ask.click()
  await page.mouse.click(5, 400)
  await expect(popup).toHaveCount(0)
})

const GLASS_WHY =
  'Automatic keeps the frosted look while your device is fast. If the device starts to feel slow, it turns the blur off by itself so scrolling stays smooth. Solid always turns the blur off, and it also saves some battery.'

for (const level of ['professional', 'beginner'] as const)
  test(`SET-B46 Reduce glass has a Why? for Automatic with the same words in ${level}`, async ({
    page,
  }) => {
    await page.addInitScript((v) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({
            level: v,
            unlocked: v === 'beginner' ? ['general.reduceGlass'] : [],
          }),
        )
        sessionStorage.setItem('seeded', '1')
      }
    }, level)
    await open(page)
    await page.locator('[data-why="glass-auto"]').click()
    const popup = page.getByTestId('sv3-why-popup')
    await expect(popup).toContainText(GLASS_WHY)
    await page.keyboard.press('Escape')
    await expect(popup).toHaveCount(0)
  })

test('SET-B48 switching the language changes every v3 text (English, Spanish, Hindi)', async ({
  page,
}) => {
  await open(page)
  const lang = page.locator('[data-setting-id="general.language"]')
  await lang.getByRole('radio', { name: 'Español' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ajustes')
  await expect(page.locator('[data-section="experience"]')).toContainText(
    'Tu experiencia',
  )
  await expect(page.locator('[data-section="pro"]')).toContainText(
    'Funciones profesionales',
  )
  await page.locator('[data-section="pro"]').click()
  await expect(
    page.getByRole('searchbox', { name: 'Buscar funciones' }),
  ).toBeVisible()
  await page.locator('[data-section="general"]').click()
  await lang.getByRole('radio', { name: 'हिन्दी' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('सेटिंग्स')
  await expect(page.locator('[data-section="experience"]')).toContainText(
    'आपका अनुभव',
  )
  await lang.getByRole('radio', { name: 'English' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings')
})

test('SET-B47 the Professional list and the Tours load as their own chunks, only when opened', async ({
  page,
}) => {
  const chunks: string[] = []
  page.on('request', (r) => {
    const m = /\/assets\/(ProFeatures|HelpSection)-/.exec(r.url())
    if (m) chunks.push(m[1])
  })
  await open(page)
  await page.waitForLoadState('networkidle')
  expect(chunks).toEqual([])
  await page.locator('[data-section="pro"]').click()
  await expect(page.locator('[data-pro-group]').first()).toBeVisible()
  expect(chunks).toEqual(['ProFeatures'])
  await page.locator('[data-section="help"]').click()
  await expect(page.locator('[data-tours-library]')).toBeVisible()
  expect(chunks).toEqual(['ProFeatures', 'HelpSection'])
})
