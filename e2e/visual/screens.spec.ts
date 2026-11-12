import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { combos, prepare, settle } from './matrix.ts'

/**
 * Screenshot tests (project "visual"): the main screens with every feature
 * switch off, in each level, colour and screen size. Pictures are per
 * operating system; with no pictures for this one the tests are skipped
 * (make them with `npm run test:visual:update`).
 */
const baselines = join(
  process.cwd(),
  'e2e',
  'visual',
  '__screenshots__',
  process.platform,
)

test.use({ timezoneId: 'UTC', locale: 'en-US' })

const SCREENS: Record<string, (page: Page) => Promise<void>> = {
  home: async (page) => {
    await page.goto('/#/')
  },
  notebooks: async (page) => {
    await page.goto('/#/')
    await page.locator('[data-space="notebooks"]').click()
  },
  settings: async (page) => {
    await page.goto('/#/settings')
  },
  search: async (page) => {
    await page.goto('/#/search')
  },
  cards: async (page) => {
    await page.goto('/#/cards')
  },
  review: async (page) => {
    await page.goto('/#/review')
  },
}

for (const [screen, open] of Object.entries(SCREENS)) {
  test.describe(screen, () => {
    for (const combo of combos) {
      test(combo.name, async ({ page }, testInfo) => {
        const update = ['all', 'changed'].includes(
          testInfo.config.updateSnapshots,
        )
        test.skip(
          !update && !existsSync(baselines),
          `no screenshots for ${process.platform} yet`,
        )
        await prepare(page, combo)
        await open(page)
        await settle(page)
        await expect(page).toHaveScreenshot(`${screen}-${combo.name}.png`, {
          animations: 'disabled',
          caret: 'hide',
          // The build number and build date change with every commit.
          mask: [
            page.getByText(/App version:/),
            page.getByText(/^Version [0-9a-f]+, built/),
          ],
          maxDiffPixelRatio: 0.002,
        })
      })
    }
  })
}
