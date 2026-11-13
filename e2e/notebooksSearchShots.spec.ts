import { test, type Page } from '@playwright/test'
import { createNotebook, sidebar } from './helpers.ts'

/**
 * Pictures for the slice-4 gate (run on purpose: `SHOTS=1 npx playwright test
 * e2e/notebooksSearchShots.spec.ts`). Beginner / Professional x Day / Night x
 * iPad landscape / phone, flags forced ON. Pictures go to
 * docs/mockups/notebooks-search-build-shots/.
 */
const OUT = 'docs/mockups/notebooks-search-build-shots'
const SIZES = {
  ipad: { width: 1194, height: 834 },
  'ipad-portrait': { width: 834, height: 1194 },
  phone: { width: 390, height: 844 },
} as const

test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['day', 'night', 'sepia'] as const)
    for (const [size, viewport] of Object.entries(SIZES)) {
      test(`shots ${level} ${theme} ${size}`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize(viewport)
        await page.addInitScript(
          ([l, th]) => {
            try {
              localStorage.setItem(
                'learning-notes:level',
                JSON.stringify({ level: l, unlocked: [] }),
              )
              localStorage.setItem('learning-notes:theme', JSON.stringify(th))
            } catch {
              /* storage blocked */
            }
          },
          [level, theme] as const,
        )
        await page.goto('/?flags=notebooks.v2,search.v2')
        await sidebar(page).waitFor({ state: 'attached' })
        await createNotebook(page, 'Biology', 'Cells')
        await createNotebook(page, 'French', 'Verbs')
        await createNotebook(page, 'Maths', 'Algebra')
        await openHome(page)
        await page.getByRole('button', { name: 'Pin French' }).click()
        await page.waitForTimeout(400)
        await page.screenshot({
          path: `${OUT}/home-${level}-${theme}-${size}.png`,
        })
        await page
          .locator('[data-notebook-card]')
          .filter({ hasText: 'Maths' })
          .click({ button: 'right' })
        await page.getByTestId('nbv2-strip').waitFor()
        await page.waitForTimeout(400)
        await page.screenshot({
          path: `${OUT}/home-strip-${level}-${theme}-${size}.png`,
        })
        await page.keyboard.press('Escape')
        await page.getByTestId('nbv2-continue').scrollIntoViewIfNeeded()
        await page.screenshot({
          path: `${OUT}/home-continue-${level}-${theme}-${size}.png`,
        })
        await page.keyboard.press('Control+K')
        const popup = page.getByRole('dialog', { name: 'Search' })
        await popup.waitFor()
        await page.keyboard.type('cells')
        await page.waitForTimeout(500)
        await page.screenshot({
          path: `${OUT}/search-${level}-${theme}-${size}.png`,
        })
        await popup.getByTestId('srv2-row').first().click({ button: 'right' })
        await page.waitForTimeout(400)
        await page.screenshot({
          path: `${OUT}/search-strip-${level}-${theme}-${size}.png`,
        })
      })
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
