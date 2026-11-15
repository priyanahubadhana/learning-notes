/// <reference lib="dom" />
import { test, expect } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** 2A.6 first-look pictures. Runs only with SHOTS=1 (not part of the suites). */
const OUT = 'docs/screens/2a6'
const SIZES = {
  'ipad-up': { width: 820, height: 1180 },
  'ipad-side': { width: 1180, height: 820 },
  phone: { width: 390, height: 844 },
} as const
const FAVS = [
  { tool: 'pen', type: 'ball', colour: '#0b6e99', size: 1, exact: null },
  { tool: 'highlighter', type: null, colour: '#ffe58a', size: 2, exact: null },
  { tool: 'pen', type: 'brush', colour: '#c62828', size: 2, exact: null },
]

test.skip(!process.env.SHOTS, 'pictures only on request')
test.setTimeout(120_000)

for (const [dev, size] of Object.entries(SIZES))
  for (const theme of ['day', 'night'] as const)
    for (const level of ['beginner', 'professional'] as const)
      test(`pen row ${dev} ${theme} ${level}`, async ({ page }) => {
        await page.setViewportSize(size)
        await page.addInitScript(
          ([th, l, f]) => {
            localStorage.setItem('learning-notes:theme', JSON.stringify(th))
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({ level: l, unlocked: [] }),
            )
            localStorage.setItem(
              'learning-notes:toolbar.favourites',
              JSON.stringify(f),
            )
          },
          [theme, level, FAVS] as const,
        )
        await startInMode(page, 'touch')
        await page.goto('/?flags=toolbar.v8')
        await createNotebook(page, 'Biology', 'First')
        await typeInEditor(page, 'The nucleus holds the DNA')
        // iPad upright starts with the sidebar closed (fault list, section 7).
        if (dev === 'ipad-up') {
          await page
            .getByRole('button', { name: /hide.*menu/i })
            .first()
            .click()
          await expect(page.locator('aside')).toBeHidden()
        }
        await page.getByTestId('v8-tool-pen').click()
        await expect(
          page.getByTestId('v8-fav-0').or(page.getByTestId('v8-favs-more')),
        ).toBeVisible()
        const dark = await page.evaluate(
          () => document.documentElement.dataset.theme,
        )
        console.log(dev, theme, level, 'theme attr =', dark)
        await page.waitForTimeout(600)
        await page.screenshot({
          path: `${OUT}/pen-row-${dev}-${theme}-${level}.png`,
        })
      })
