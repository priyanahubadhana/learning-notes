// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** First-look pictures for task 2A.14: the bar names (and the Box card under Box). Run by hand. */
const OUT = process.env.SHOTS_OUT ?? 'docs/mockups/toolbar-v9-build-shots/2a14'
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
      test(`${level} ${theme} ${size}`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.emulateMedia({ colorScheme: theme })
        await page.addInitScript(
          (x) => {
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({ level: x.level, unlocked: [] }),
            )
            localStorage.setItem(
              'learning-notes:theme',
              JSON.stringify(x.theme === 'dark' ? 'night' : x.theme),
            )
          },
          { level, theme },
        )
        await startInMode(page, 'pencil')
        await page.goto('/?flags=toolbar.v8')
        await createNotebook(page, 'Biology', 'First')
        await typeInEditor(page, 'The nucleus holds the DNA')
        // The side list closed, so the bar has the room for names.
        const hide = page.getByRole('button', { name: 'Hide menu' })
        if (await hide.isVisible()) await hide.click()
        await page.waitForTimeout(800)
        mkdirSync(OUT, { recursive: true })
        await page.screenshot({ path: `${OUT}/${level}-${theme}-${size}.png` })
        if (level === 'professional' && size !== 'phone') {
          await page.getByTestId('v8-tool-text').click()
          await page.locator('.bn-editor').first().click()
          await page.getByTestId('v8-chip-text.box').click()
          await page.waitForTimeout(500)
          await page.screenshot({
            path: `${OUT}/${level}-${theme}-${size}-box-card.png`,
          })
        }
        writeFileSync(`${OUT}/.keep`, '')
      })
