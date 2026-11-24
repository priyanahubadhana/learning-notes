// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { test } from '@playwright/test'
import { openNote } from './mainBarHelpers.ts'

/** Pictures for B12 (v8 top row with Mic, Backspace, Enter, Paste), Pencil mode. */
const SIZES = {
  'ipad-sideways': { width: 1180, height: 820 },
  'ipad-upright': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
} as const

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['light', 'dark'] as const)
    for (const [name, size] of Object.entries(SIZES))
      test(`b12 ${level} ${theme} ${name}`, async ({ page }) => {
        await page.setViewportSize(size)
        await openNote(page, 'pencil', {
          flags: ['page.menus', 'toolbar.v8', 'foundation.shell'],
          level: { level, unlocked: [] },
          'toolbar.v9.tools': [
            'text',
            'pen',
            'eraser',
            'shapes',
            'lasso',
            'insert',
            'mic',
          ],
        })
        await page.evaluate(
          (t) =>
            localStorage.setItem(
              'learning-notes:theme',
              JSON.stringify(t === 'dark' ? 'night' : 'day'),
            ),
          theme,
        )
        await page.reload()
        await page.waitForTimeout(1500)
        await page.screenshot({
          path: `screenshots/b11-b12/b12-${level}-${theme}-${name}.png`,
        })
      })
