/// <reference lib="dom" />
import { test, expect } from '@playwright/test'
import {
  closeSidebarIfNarrow,
  createNotebook,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/** 2A.13 first-look pictures. Runs only with SHOTS=1 (not part of the suites). */
const OUT = process.env.SHOTS_OUT ?? 'docs/screens/2a13'
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
      test(`favourites ${dev} ${theme} ${level}`, async ({ page }) => {
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
        await page.goto(
          '/?flags=foundation.shell,toolbar.v8,toolbar.menu,page.menus,textbox.v2',
        )
        await createNotebook(page, 'Biology', 'First')
        await closeSidebarIfNarrow(page)
        await typeInEditor(page, 'The nucleus holds the DNA')
        // closeSidebarIfNarrow (above) closed it.
        if (dev === 'ipad-up') await expect(page.locator('aside')).toBeHidden()
        await page.getByTestId('v8-tool-pen').click()
        const shot = async (name: string) => {
          await page.waitForTimeout(500)
          await page.screenshot({
            path: `${OUT}/${name}-${dev}-${theme}-${level}.png`,
          })
        }
        await page.getByTestId('v8-organise').click()
        await expect(page.getByTestId('arrange-sheet')).toBeVisible()
        await shot('organise')
        await page.getByTestId('arrange-add').click()
        await expect(page.getByTestId('v8-addsheet')).toBeVisible()
        await page.getByTestId('v8-add-preset').click()
        await page.getByTestId('v8-add-preset-2').click()
        await page.getByTestId('v8-add-name').fill('Quick brush')
        await shot('add')
        await page.getByTestId('fb-sheet-ok').click()
        await page.getByTestId('fb-sheet-ok').click()
        await shot('row')
      })
