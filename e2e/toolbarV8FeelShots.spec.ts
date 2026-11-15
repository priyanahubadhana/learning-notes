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
 * First-look pictures for 2A.7, the Feel card (run on purpose:
 * `SHOTS=1 npx playwright test e2e/toolbarV8FeelShots.spec.ts`).
 * Light and dark, Beginner and Professional, iPad upright and sideways, phone.
 */
const OUT = 'screenshots/2a7'
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
    (l) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: [] }),
      )
    },
    pro ? 'professional' : 'beginner',
  )
  await startInTheme(page, theme)
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  if (size.width === 820) await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
  if (size.width < 500) await page.keyboard.press('Escape')
  const feel = page.getByTestId('v8-chip-pen.feel')
  if (await feel.count()) await feel.click()
  else {
    await page.getByTestId('v8-row-more').click()
    await page.getByTestId('v8-fold-feel').click()
  }
  await expect(page.getByTestId('v8-card-pen.feel')).toBeVisible()
}

for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night'] as const) {
    for (const pro of [false, true]) {
      const level = pro ? 'professional' : 'beginner'
      test(`${dev} ${theme} ${level}`, async ({ page }) => {
        // test-guard-reason: several pictures in one run need more time
        test.setTimeout(90_000)
        await setUp(page, theme, size, pro)
        const tabs = pro
          ? ['Feel', 'Aids', 'Math', 'Page']
          : ['Feel', 'Math', 'Page']
        for (const name of tabs) {
          await page
            .getByTestId('v8-card-pen.feel')
            .getByRole('tab', { name })
            .click()
          await page.waitForTimeout(500)
          await page.screenshot({
            path: `${OUT}/feel-${name.toLowerCase()}-${dev}-${theme}-${level}.png`,
          })
        }
      })
    }
  }
}
