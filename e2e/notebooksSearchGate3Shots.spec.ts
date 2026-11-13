import { test, type Page } from '@playwright/test'
import { createNotebook, showSidebar, sidebar } from './helpers.ts'

/**
 * Gate 3 pictures for the 7 slice-4 fixes (run on purpose:
 * `SHOTS=1 PHASE=before|after npx playwright test e2e/notebooksSearchGate3Shots.spec.ts`).
 * Day / Night / Sepia; phone with touch on, iPad both ways.
 */
const OUT = `screenshots/gate3-4/${process.env.PHASE ?? 'after'}`
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')
test.use({ hasTouch: true })

async function setUp(
  page: Page,
  theme: string,
  size: { width: number; height: number },
) {
  await page.addInitScript((th) => {
    try {
      localStorage.setItem('learning-notes:theme', JSON.stringify(th))
    } catch {
      /* storage blocked */
    }
  }, theme)
  await page.setViewportSize({ width: 1336, height: 720 })
  await page.goto('/?flags=notebooks.v2,search.v2')
  await sidebar(page).waitFor({ state: 'attached' })
  await createNotebook(page, 'Biology', 'Cells')
  await createNotebook(page, 'French', 'Verbs')
  await createNotebook(page, 'Maths', 'Algebra')
  await page.setViewportSize(size)
  await page.reload()
  await sidebar(page).waitFor({ state: 'attached' })
}

async function openHome(page: Page) {
  const rail = page.locator('[data-space="notebooks"]')
  const home = page.getByTestId('notebooks-home')
  await rail.click()
  if (!(await home.isVisible())) {
    await page.keyboard.press('Escape')
    await rail.click()
  }
  await home.waitFor()
}

const settle = (page: Page) => page.waitForTimeout(700)

for (const theme of ['day', 'night', 'sepia'] as const) {
  test(`phone ${theme}`, async ({ page }) => {
    test.setTimeout(120_000)
    await setUp(page, theme, { width: 390, height: 844 })
    await openHome(page)
    await page.getByTestId('nbv2-continue').scrollIntoViewIfNeeded()
    await settle(page)
    await page.screenshot({ path: `${OUT}/1-continue-phone-${theme}.png` })
    await page
      .locator('[data-notebook-card]')
      .filter({ hasText: 'Maths' })
      .click({ button: 'right' })
    await page.getByTestId('nbv2-strip').waitFor()
    await settle(page)
    await page.screenshot({ path: `${OUT}/4-5-strip-phone-${theme}.png` })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+K')
    const popup = page.getByRole('dialog', { name: 'Search' })
    await popup.waitFor()
    await page.keyboard.type('cells')
    await settle(page)
    await page.screenshot({ path: `${OUT}/2-3-search-phone-${theme}.png` })
    await popup.getByTestId('srv2-row').first().click({ button: 'right' })
    await settle(page)
    await page.screenshot({ path: `${OUT}/4-search-strip-phone-${theme}.png` })
  })

  test(`ipad ${theme}`, async ({ page }) => {
    test.setTimeout(120_000)
    await setUp(page, theme, { width: 834, height: 1194 })
    await openHome(page)
    await settle(page)
    await page.screenshot({
      path: `${OUT}/1-continue-ipad-portrait-${theme}.png`,
    })
    await page.keyboard.press('Control+K')
    await page.getByRole('dialog', { name: 'Search' }).waitFor()
    await page.keyboard.type('cells')
    await settle(page)
    await page.screenshot({
      path: `${OUT}/7-search-ipad-portrait-${theme}.png`,
    })
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1194, height: 834 })
    await showSidebar(page)
    await settle(page)
    await page.screenshot({ path: `${OUT}/6-sidebar-ipad-${theme}.png` })
  })
}
