import { test } from '@playwright/test'
import { createNotebook, openSearchPopup, typeInEditor } from './helpers.ts'

/**
 * Pictures for the F5 final look (run on purpose: `SHOTS=1 npx playwright test
 * e2e/searchCloseShots.spec.ts`). Search pop-up with text typed: Light / Dark /
 * Sepia x Beginner / Professional x iPad landscape + portrait, phone (touch,
 * on ipad-webkit) and PC (chromium). Pictures go to docs/mockups/fix-search-shots/.
 */
const OUT = 'docs/mockups/fix-search-shots'
const SIZES = {
  ipad: { width: 1194, height: 834 },
  'ipad-portrait': { width: 834, height: 1194 },
  phone: { width: 390, height: 844 },
  pc: { width: 1440, height: 900 },
} as const

test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['day', 'night', 'sepia'] as const)
    for (const [size, viewport] of Object.entries(SIZES)) {
      test(`shots ${level} ${theme} ${size}`, async ({ page }, info) => {
        test.skip(
          (size === 'pc') !== (info.project.name === 'chromium'),
          'PC on chromium, touch sizes on ipad-webkit',
        )
        test.setTimeout(120_000)
        await page.setViewportSize(viewport)
        await page.addInitScript(
          ([l, th]) => {
            try {
              localStorage.setItem(
                'learning-notes:level',
                JSON.stringify({ level: l, unlocked: [] }),
              )
              localStorage.setItem('learning-notes:theme', JSON.stringify(th))
            } catch {
              /* storage blocked */
            }
          },
          [level, theme] as const,
        )
        await page.goto('/?flags=search.v2')
        await createNotebook(page, 'Biology', 'Cells')
        await typeInEditor(page, 'The nucleus holds DNA')
        await page.waitForTimeout(700)
        const popup = await openSearchPopup(page)
        await popup.getByRole('combobox').fill('nucleus')
        await page.waitForTimeout(500)
        await page.screenshot({
          path: `${OUT}/search-${level}-${theme}-${size}.png`,
        })
      })
    }
