/// <reference lib="dom" />
import { test, expect } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** 2A.16 part B first-look pictures. Runs only with SHOTS=1 (not part of the suites). */
const OUT = process.env.SHOTS_OUT ?? 'screenshots/2a16/2a16b-sheets'
const FLAGS = 'foundation.shell,toolbar.v8,toolbar.menu,page.menus,textbox.v2'
const SIZES = {
  'ipad-upright': { width: 820, height: 1180 },
  'ipad-sideways': { width: 1180, height: 820 },
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
      test(`sheets and feel ${dev} ${theme} ${level}`, async ({ page }) => {
        await page.setViewportSize(size)
        await page.addInitScript(
          ([th, l, f]) => {
            localStorage.setItem('learning-notes:theme', JSON.stringify(th))
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({
                level: l,
                unlocked: l === 'professional' ? ['tb.layers'] : [],
              }),
            )
            localStorage.setItem(
              'learning-notes:toolbar.favourites',
              JSON.stringify(f),
            )
          },
          [theme, level, FAVS] as const,
        )
        await startInMode(page, 'touch')
        await page.goto(`/?flags=${FLAGS}`)
        await createNotebook(page, 'Biology', 'First')
        await typeInEditor(page, 'The nucleus holds the DNA')
        if (dev === 'ipad-upright') {
          await page
            .getByRole('button', { name: /hide.*menu/i })
            .first()
            .click()
          await page.waitForTimeout(700)
        }
        await page.getByTestId('v8-tool-pen').click()
        const shot = async (name: string) => {
          await page.waitForTimeout(600)
          await page.screenshot({
            path: `${OUT}/${name}-${dev}-${theme}-${level}.png`,
          })
        }
        await page.getByTestId('v8-organise').click()
        await expect(page.getByTestId('arrange-sheet')).toBeVisible()
        await shot('organise')
        await page.getByTestId('arrange-add').click()
        await expect(page.getByTestId('v8-addsheet')).toBeVisible()
        await shot('add')
        await page.getByTestId('fb-sheet-close').click() // back to Organise
        await expect(page.getByTestId('arrange-sheet')).toBeVisible()
        await page.getByTestId('fb-sheet-ok').click()
        await expect(page.getByTestId('arrange-sheet')).toHaveCount(0)
        if (await page.getByTestId('v8-chip-pen.feel').isVisible())
          await page.getByTestId('v8-chip-pen.feel').click()
        else {
          // On a phone Feel sits under the row's ⋯.
          await page.getByTestId('v8-row-more').click()
          await page.getByTestId('v8-fold-feel').click()
        }
        await expect(page.getByTestId('v8-card-pen.feel')).toBeVisible()
        await shot('feel')
        await page
          .getByTestId('v8-card-pen.feel')
          .getByRole('tab', { name: 'Page' })
          .click()
        await shot('feel-page')
      })
