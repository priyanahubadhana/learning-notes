// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * First-look pictures for 2A.11, the Lasso (run on purpose:
 * `SHOTS=1 npx playwright test e2e/toolbarV9LassoShots.spec.ts`).
 * Light and dark, Beginner and Professional, iPad upright and sideways, phone.
 */
const OUT = 'screenshots/2a11'
// test-guard-reason: pictures only on purpose, same as the other Shots files
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')
test.use({ hasTouch: true })

const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-sideways': { width: 1180, height: 820 },
  'ipad-upright': { width: 820, height: 1180 },
} as const

async function setUp(
  page: Page,
  theme: 'day' | 'night',
  size: { width: number; height: number },
  pro: boolean,
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [
      pro ? 'professional' : 'beginner',
      pro ? ['tb.lassoOptions'] : [],
    ] as const,
  )
  await startInTheme(page, theme)
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  if (size.width === 820) await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  const direct = page.getByTestId('v8-tool-lasso')
  if (!(await direct.isVisible())) {
    await page.getByTestId('v8-more').click()
    await page.getByTestId('v8-fold-lasso').click()
  } else await direct.click()
  await expect(page.getByText('Switched to Pencil mode')).toHaveCount(0, {
    timeout: 20_000,
  })
}

/** Opens a card by its chip; on a narrow bar the chip waits in the ⋯ list. */
async function openCard(page: Page, id: string, foldName: string) {
  const chip = page.getByTestId(`v8-chip-${id}`)
  if (await chip.isVisible()) await chip.click()
  else {
    await page.getByTestId('v8-row-more').click()
    await page
      .getByTestId('v8-card-fold.row')
      .getByRole('button', { name: foldName })
      .click()
  }
  await expect(page.getByTestId(`v8-card-${id}`)).toBeVisible()
  await page.waitForTimeout(500)
}

for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night'] as const) {
    for (const pro of [false, true]) {
      const level = pro ? 'professional' : 'beginner'
      test(`${dev} ${theme} ${level}`, async ({ page }) => {
        // test-guard-reason: several pictures in one run need more time
        test.setTimeout(90_000)
        await setUp(page, theme, size, pro)
        const tag = `${dev}-${theme}-${level}`
        await page.waitForTimeout(500)
        await page.screenshot({ path: `${OUT}/row-${tag}.png` })
        if (!pro) {
          for (const [id, name] of [
            ['lasso.shape', 'Shape'],
            ['lasso.actions', 'Actions'],
          ]) {
            await openCard(page, id, name)
            await page.screenshot({
              path: `${OUT}/${id.replace('.', '-')}-${tag}.png`,
            })
            await page.getByRole('button', { name: 'Close' }).click()
          }
          return
        }
        await openCard(page, 'lasso.opts', 'Options')
        const c = page.getByTestId('v8-card-lasso.opts')
        await page.screenshot({ path: `${OUT}/options-${tag}.png` })
        await c.getByRole('button', { name: /Menu row/ }).click()
        await page.waitForTimeout(300)
        await page.screenshot({ path: `${OUT}/options-menurow-${tag}.png` })
        await c.getByRole('button', { name: /Menu row/ }).click()
        await c.getByRole('button', { name: /Layers/ }).click()
        await page.waitForTimeout(300)
        await page.screenshot({ path: `${OUT}/options-layers-${tag}.png` })
      })
    }
  }
}
