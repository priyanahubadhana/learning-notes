// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** First-look pictures for the 2A.12 ⋯ More card. Run by hand (SHOTS=1). */
const OUT = 'docs/mockups/toolbar-v9-build-shots/2a12-more'
const SIZES = [
  ['ipad-upright', 820, 1180],
  ['ipad-sideways', 1180, 820],
  ['phone', 390, 844],
] as const

test.skip(!process.env.SHOTS, 'pictures are taken by hand (SHOTS=1)')
test.use({ hasTouch: true })

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['light', 'dark'] as const)
    for (const [size, width, height] of SIZES)
      test(`more ${level} ${theme} ${size}`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.emulateMedia({ colorScheme: theme })
        await page.addInitScript(
          (x) => {
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({
                level: x.level,
                unlocked:
                  x.level === 'professional'
                    ? ['tb.layouts', 'tb.allTools']
                    : [],
              }),
            )
            localStorage.setItem(
              'learning-notes:theme',
              JSON.stringify(x.theme === 'dark' ? 'night' : x.theme),
            )
          },
          { level, theme },
        )
        await startInMode(page, 'touch')
        await page.goto('/?flags=toolbar.v8,toolbar.menu')
        await createNotebook(page, 'Biology', 'First')
        await typeInEditor(page, 'The nucleus holds the DNA')
        await page.getByTestId('v8-tool-pen').click()
        await page.getByTestId('v8-tool-eraser').click()
        await page.getByTestId('v8-more').click()
        await page
          .getByRole('button', { name: 'Mark for review' })
          .click()
          .catch(() => {})
        await page.waitForTimeout(600)
        mkdirSync(OUT, { recursive: true })
        await page.screenshot({
          path: `${OUT}/more-${level}-${theme}-${size}.png`,
        })
      })
