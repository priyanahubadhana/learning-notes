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
 * Gate 3 pictures for toolbar.v8 slices 1e and 1f and BUG-003 (run on
 * purpose: `SHOTS=1 npx playwright test e2e/toolbarV8TextGate3Shots.spec.ts`).
 * Day / Night / Sepia on phone, iPad both ways and PC.
 */
const OUT = 'screenshots/gate3-1/1ef'
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
  'tb.textBox',
  'tb.textFonts',
  'tb.textMarks',
  'tb.insertMore',
  'tb.allTools',
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
  await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const settle = (page: Page) => page.waitForTimeout(500)

async function openChip(page: Page, id: string) {
  const chip = page.getByTestId(`v8-chip-${id}`)
  if (!(await chip.isVisible())) {
    await page.getByTestId('v8-row-more').click()
    await page.getByTestId(`v8-fold-${id.split('.')[1]}`).click()
  } else await chip.click()
  await expect(page.getByTestId(`v8-card-${id}`)).toBeVisible()
  await settle(page)
}

async function closeCard(page: Page) {
  await page.getByTestId('pcard-close').click()
  // The card has finished closing before the next tap.
  await expect(page.locator('.pcard')).toHaveCount(0)
}

for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night', 'sepia'] as const) {
    for (const level of ['beginner', 'professional'] as const) {
      if (level === 'professional' && dev !== 'ipad-landscape' && dev !== 'pc')
        continue
      test(`${dev} ${theme} ${level}`, async ({ page }) => {
        // test-guard-reason: many pictures in one run need more time
        test.setTimeout(120_000)
        await setUp(page, theme, size, level)
        const tag = `${dev}-${theme}-${level}`
        const shot = (name: string) =>
          page.screenshot({ path: `${OUT}/${name}-${tag}.png` })
        // The Text row, then the Format card.
        await shot('textrow')
        await openChip(page, 'text.format')
        await shot('format')
        if (level === 'professional') {
          // Advanced: each font in its own face, and line height (TB-41).
          await page
            .getByTestId('v8-format')
            .evaluate((e) => e.scrollTo(0, e.scrollHeight))
          await settle(page)
          await shot('formatadv')
        }
        await closeCard(page)
        // The Box card beside the selected box.
        await page.locator('.bn-editor').first().click()
        await openChip(page, 'text.box')
        await shot('box')
        await closeCard(page)
        // The settings button in front of Box.
        await openChip(page, 'text.boxset')
        await shot('boxset')
        await closeCard(page)
        // Insert.
        const insert = page.getByTestId('v8-tool-insert')
        if (await insert.isVisible()) await insert.click()
        else {
          await page.getByTestId('v8-more').click()
          await page.getByTestId('v8-fold-insert').click()
        }
        await expect(page.getByTestId('v8-card-insert')).toBeVisible()
        await settle(page)
        await shot('insert')
        await closeCard(page)
        // The ⋯ card.
        await page.getByTestId('v8-more').click()
        await expect(page.getByTestId('v8-card-fold.bar')).toBeVisible()
        await settle(page)
        await shot('more')
        if (level === 'professional') {
          await page.getByTestId('v8-more-alltools').click()
          await expect(page.getByTestId('v8-card-more.alltools')).toBeVisible()
          await settle(page)
          await shot('alltools')
          await closeCard(page)
          await page.getByTestId('v8-more').click()
        }
        // The bar turned off: the one Show toolbar pill.
        await page.getByTestId('v8-more-hide').click()
        await page.getByRole('button', { name: 'Turn off' }).click()
        await expect(page.getByTestId('show-tool-bar')).toBeVisible()
        // Toasts closed before the picture (repeat-fault list).
        await expect(page.getByText('Tool bar turned off')).toHaveCount(0, {
          timeout: 20_000,
        })
        await settle(page)
        await shot('pill')
      })
    }
  }
}
