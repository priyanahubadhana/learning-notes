// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { addBox, pick, selectMain, start } from './cBoxesHelpers.ts'

/**
 * First-look pictures of Q-1 (one ⋯ per box: the bar's), iPad upright, light
 * and dark, switch textbox.v2 ON. Written to screenshots/q1-q3/.
 */
test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  deviceScaleFactor: 2,
})
const OUT = 'screenshots/q1-q3'
const shot = (page: Page, file: string) => {
  mkdirSync(OUT, { recursive: true })
  return page.screenshot({ path: `${OUT}/${file}.png` })
}

for (const [label, theme] of [
  ['light', 'day'],
  ['dark', 'night'],
]) {
  test(`Q-1 pictures: iPad upright, ${label}`, async ({ page }) => {
    await start(page, `Q1 ${label}`)
    await page.evaluate(
      (th) => document.documentElement.setAttribute('data-theme', th),
      theme,
    )
    const box = await addBox(page, ['Alpha'], 0.4, 120)
    await pick(page, box)
    await expect(page.getByTestId('ob-boxmore')).toBeVisible()
    await expect(box.locator('[data-box-menu]')).toHaveCount(0)
    await shot(page, `bar-one-more-${label}`)
    // The first box has the bar too (Q-1).
    await selectMain(page)
    await expect(page.getByTestId('ob-boxmore')).toBeVisible()
    await expect(page.locator('[data-box-menu]')).toHaveCount(0)
    await shot(page, `first-box-bar-${label}`)
    // Q-3: Delete on the first box; the next box moves up.
    await page
      .locator('[data-box-bar]')
      .getByRole('button', { name: 'Delete box' })
      .click()
    await expect(page.locator('[data-paper-box="main"]')).toContainText('Alpha')
    await page.waitForTimeout(600)
    await shot(page, `after-delete-next-up-${label}`)
    // With no other box the page has no box.
    await selectMain(page)
    await page
      .locator('[data-box-bar]')
      .getByRole('button', { name: 'Delete box' })
      .click()
    await expect(page.locator('[data-paper-box="main"]')).toHaveAttribute(
      'data-main-gone',
      '',
    )
    await page.waitForTimeout(600)
    await shot(page, `after-delete-no-box-${label}`)
    mkdirSync(OUT, { recursive: true })
    writeFileSync(
      `${OUT}/INDEX.md`,
      '# Q-1 pictures (iPad upright, light and dark)\n\n' +
        '- bar-one-more-*: a selected box: the bar has the only ⋯; the frame has none\n',
    )
  })
}
