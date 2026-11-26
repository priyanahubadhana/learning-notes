// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

const OUT = 'screenshots/c36'
// test-guard-reason: pictures only on purpose, same as the other Shots files
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')
test.use({ hasTouch: true })

const FLAGS = 'foundation.shell,toolbar.v8,toolbar.menu,page.menus,textbox.v2'
const SIZES = {
  'ipad-upright': { width: 820, height: 1180 },
  'ipad-sideways': { width: 1140, height: 820 },
  phone: { width: 390, height: 844 },
} as const
const PRO = ['tb.eraserOptions', 'tb.allTools', 'tb.insertMore']

for (const [dev, size] of Object.entries(SIZES))
  for (const theme of ['day', 'night'] as const)
    for (const level of ['beginner', 'professional'] as const)
      test(`${dev} ${theme} ${level}`, async ({ page }) => {
        // test-guard-reason: several pictures in one run need more time
        test.setTimeout(120_000)
        const tag = `${dev}-${theme}-${level}`
        const shot = (n: string) =>
          page.screenshot({ path: `${OUT}/${n}-${tag}.png` })
        await page.addInitScript(
          ([l, u]) =>
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({ level: l, unlocked: u }),
            ),
          [level, level === 'professional' ? PRO : []] as const,
        )
        await startInTheme(page, theme)
        await page.setViewportSize(size)
        await startInMode(page, 'touch')
        await page.goto(`/?flags=${FLAGS}`)
        await createNotebook(page, 'Biology', 'First')
        await hideSidebar(page)
        const close = page.locator(
          'button[aria-controls="sidebar"][aria-expanded="true"]:visible',
        )
        if (await close.count()) await close.first().click()
        await typeInEditor(page, 'The nucleus holds the DNA')
        // C3: the eraser bar.
        await page.getByTestId('v8-tool-eraser').click()
        await page.waitForTimeout(500)
        await shot('c3-eraser')
        // C6 and C9: More > Tool bar, then editing with the tray.
        await page.getByTestId('v8-more').click()
        await page
          .getByRole('dialog', { name: 'More' })
          .getByRole('button', { name: 'Tool bar', exact: true })
          .click()
        await page.waitForTimeout(400)
        await shot('c6-more')
        await page.getByTestId('v8-more-editbar').click()
        await expect(page.getByTestId('v8-edit-tray')).toBeVisible()
        await page.waitForTimeout(400)
        await shot('c9-tray')
        await page.getByTestId('v8-edit-done').click()
        // C7: Page options > Arrange pinned actions.
        if (size.width > 400) {
          await page.getByRole('button', { name: 'More options' }).click()
          const sheet = page.getByTestId('page-sheet')
          await expect(sheet).toBeVisible()
          const arr = sheet.getByTestId('ps-arrange')
          if (await arr.count()) await arr.click()
          await page.waitForTimeout(500)
          await shot('c7-arrange')
        }
      })
