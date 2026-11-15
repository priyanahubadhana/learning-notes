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
 * First-look pictures for 2A.8, the eraser (run on purpose:
 * `SHOTS=1 npx playwright test e2e/toolbarV8EraserShots.spec.ts`).
 * Light and dark, Beginner and Professional, iPad upright and sideways, phone.
 */
const OUT = 'screenshots/2a8'
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
      pro ? ['tb.eraserOptions'] : [],
    ] as const,
  )
  await startInTheme(page, theme)
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  if (size.width === 820) await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  const direct = page.getByTestId('v8-tool-eraser')
  if (!(await direct.isVisible())) {
    await page.getByTestId('v8-more').click()
    await page.getByTestId('v8-fold-eraser').click()
  } else await direct.click()
  await expect(page.getByText('Switched to Pencil mode')).toHaveCount(0, {
    timeout: 20_000,
  })
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
        const cards = pro ? ['eraser.mode', 'eraser.size'] : ['eraser.mode']
        for (const id of cards) {
          await page.getByTestId(`v8-chip-${id}`).click()
          await expect(page.getByTestId(`v8-card-${id}`)).toBeVisible()
          await page.waitForTimeout(500)
          await page.screenshot({
            path: `${OUT}/${id.replace('.', '-')}-${tag}.png`,
          })
          await page.getByRole('button', { name: 'Close' }).click()
        }
      })
    }
  }
}
