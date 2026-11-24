import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { closeCorner } from '../helpers.ts'
import { combos, prepare, settle } from './matrix.ts'

/**
 * Screenshot tests for Home with `home.v2` ON (new pictures only: the
 * flag-off pictures in screens.spec.ts stay as they are). Same rules as there:
 * pictures are per operating system; none for this one = skipped.
 */
const baselines = join(
  process.cwd(),
  'e2e',
  'visual',
  '__screenshots__',
  process.platform,
)

test.use({ timezoneId: 'UTC', locale: 'en-US' })

const SIZES = ['phone', 'ipad-portrait', 'pc']
const wanted = combos.filter(
  (c) => c.level === 'professional' && SIZES.includes(c.size),
)

for (const editing of [false, true]) {
  test.describe(editing ? 'home-v2-edit' : 'home-v2', () => {
    for (const combo of wanted) {
      if (editing && combo.size !== 'phone') continue
      test(combo.name, async ({ page }, testInfo) => {
        const update = ['all', 'changed'].includes(
          testInfo.config.updateSnapshots,
        )
        test.skip(
          !update && !existsSync(baselines),
          `no screenshots for ${process.platform} yet`,
        )
        await prepare(page, combo)
        await page.goto('/?flags=home.v2#/')
        await closeCorner(page)
        await page.locator('[data-space="home"]').click()
        await expect(page.getByTestId('home-widgets')).toBeVisible()
        if (editing) await page.getByTestId('home-edit').click()
        await settle(page)
        await expect(page).toHaveScreenshot(
          `${editing ? 'home-v2-edit' : 'home-v2'}-${combo.name}.png`,
          {
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.002,
          },
        )
      })
    }
  })
}
