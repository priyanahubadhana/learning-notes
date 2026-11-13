// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * Gate 3 pictures for toolbar.v8 slice 1d (run on purpose:
 * `SHOTS=1 npx playwright test e2e/toolbarV8ToolsGate3Shots.spec.ts`).
 * Day / Night / Sepia on phone, iPad both ways and PC.
 */
const OUT = 'screenshots/gate3-1/1d'
// test-guard-reason: pictures only on purpose, same as the other Gate3Shots files
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')
test.use({ hasTouch: true })

const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-landscape': { width: 1180, height: 820 },
  'ipad-portrait': { width: 820, height: 1180 },
  pc: { width: 1440, height: 900 },
} as const

const PRO = [
  'tb.eraserOptions',
  'tb.shapesAids',
  'tb.lassoOptions',
  'tb.selectionMenu',
]

async function setUp(
  page: Page,
  theme: 'day' | 'night' | 'sepia',
  size: { width: number; height: number },
  level: 'beginner' | 'professional',
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, level === 'professional' ? PRO : []] as const,
  )
  await startInTheme(page, theme)
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const settle = (page: Page) => page.waitForTimeout(500)

/** A tool in the bar, or in the more card when a narrow screen folds it. */
async function pickTool(page: Page, tool: string) {
  const direct = page.getByTestId(`v8-tool-${tool}`)
  if (!(await direct.isVisible())) {
    await page.getByTestId('v8-more').click()
    await page.getByTestId(`v8-fold-${tool}`).click()
    return
  }
  await direct.click()
}

async function shoot(page: Page, name: string, tool: string, cardId: string) {
  await pickTool(page, tool)
  await page.getByTestId(`v8-chip-${cardId}`).click()
  await expect(page.getByTestId(`v8-card-${cardId}`)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  await page.keyboard.press('Escape')
}

for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night', 'sepia'] as const) {
    for (const level of ['beginner', 'professional'] as const) {
      // Professional only on iPad landscape and PC, to keep the set small.
      if (level === 'professional' && dev !== 'ipad-landscape' && dev !== 'pc')
        continue
      test(`${dev} ${theme} ${level}`, async ({ page }) => {
        // test-guard-reason: many pictures in one run need more time
        test.setTimeout(120_000)
        await setUp(page, theme, size, level)
        const tag = `${dev}-${theme}-${level}`
        await shoot(page, `eraser-${tag}`, 'eraser', 'eraser.mode')
        await shoot(page, `shapes-${tag}`, 'shapes', 'shapes.shape')
        await shoot(page, `lasso-${tag}`, 'lasso', 'lasso.actions')
        // A selection: the bar, then its More card.
        await page.getByText('The nucleus holds the DNA').click({ force: true })
        await page.keyboard.press('End')
        await page.keyboard.press('Shift+Home')
        await expect(page.getByTestId('v8-selbar')).toBeVisible()
        await settle(page)
        await page.screenshot({ path: `${OUT}/selbar-${tag}.png` })
        await page.getByTestId('v8-sel-more').click()
        await settle(page)
        await page.screenshot({ path: `${OUT}/selbar-more-${tag}.png` })
      })
    }
  }
}
