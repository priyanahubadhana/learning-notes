// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  closeSidebarIfNarrow,
  createNotebook,
  hideSidebar,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * First-look pictures for 2A.10 (the Format on states). Run on purpose:
 * `SHOTS=1 npx playwright test e2e/toolbarV10FormatOnShots.spec.ts`.
 * Light and dark, Beginner and Professional, iPad both ways and phone.
 */
const OUT = process.env.SHOTS_OUT ?? 'screenshots/2a10'
// test-guard-reason: pictures only on purpose, same as the other Shots files
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')
test.use({ hasTouch: true })

const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-landscape': { width: 1180, height: 820 },
  'ipad-portrait': { width: 820, height: 1180 },
} as const

const PRO = ['tb.textFonts', 'tb.textMarks']

async function setUp(
  page: Page,
  theme: 'day' | 'night',
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
  await page.goto(
    '/?flags=foundation.shell,toolbar.v8,toolbar.menu,page.menus,textbox.v2',
  )
  await createNotebook(page, 'Biology', 'First')
  await closeSidebarIfNarrow(page)
  await hideSidebar(page)
  if (size.width === 820) {
    const aside = page.locator('aside')
    if (await aside.isVisible()) {
      await page
        .locator(
          'button[aria-controls="sidebar"][aria-expanded="true"]:visible',
        )
        .click()
      await expect(aside).toBeHidden()
    }
  }
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByText('The nucleus holds the DNA').click({ clickCount: 3 })
}

for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night'] as const) {
    for (const level of ['beginner', 'professional'] as const) {
      test(`${dev} ${theme} ${level}`, async ({ page }) => {
        // test-guard-reason: many pictures in one run need more time
        test.setTimeout(120_000)
        await setUp(page, theme, size, level)
        const tag = `${dev}-${theme}-${level}`
        const chip = page.getByTestId('v8-chip-text.format')
        if (!(await chip.isVisible())) {
          await page.getByTestId('v8-row-more').click()
          await page.getByTestId('v8-fold-format').click()
        } else await chip.click()
        const c = page.getByTestId('v8-card-text.format')
        await expect(c).toBeVisible()
        await page.waitForTimeout(500)
        const tile = (id: string) => c.getByTestId(`v8-format-${id}`)
        await tile('bold').click()
        await tile('italic').click()
        await tile('mark:key').click()
        await c.getByTestId('v8-format-tab-style').click()
        await tile('bulletList').click()
        await c.getByTestId('v8-format-tab-paragraph').click()
        await tile('alignCenter').click()
        const ids = ['text', 'style', 'paragraph']
        if (level === 'professional') ids.push('advanced')
        for (const id of ids) {
          await c.getByTestId(`v8-format-tab-${id}`).click()
          await page.waitForTimeout(300)
          await page.screenshot({ path: `${OUT}/format-${id}-${tag}.png` })
        }
      })
    }
  }
}
