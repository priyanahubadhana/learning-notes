// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openNote, pref, tool } from './mainBarHelpers.ts'

/**
 * Polish 2, item 3: the first time a tool is used, a small dismissible line
 * says what to do. It shows once per device and Show help off hides it.
 */

test('the Lasso tip shows once, and not again', async ({ page }) => {
  await openNote(page, 'touch', { 'firstUse.seen': [] })
  const tip = page.locator('[data-first-use="lasso"]')
  await expect(tip).toHaveCount(0)
  await tool(page, 'Lasso').click()
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('Loop ink to select')
  expect(await pref<string[]>(page, 'firstUse.seen')).toContain('lasso')
  // Close it, pick another tool and the Lasso again: no tip this time.
  await tip.getByRole('button', { name: 'Close' }).click()
  await expect(tip).toHaveCount(0)
  await tool(page, 'Pen').click()
  await tool(page, 'Lasso').click()
  await expect(tip).toHaveCount(0)
})

test('Show help off keeps the tips away', async ({ page }) => {
  await openNote(page, 'touch', {
    'firstUse.seen': [],
    'general.showHelp': 'off',
  })
  await tool(page, 'Lasso').click()
  await page.waitForTimeout(400)
  await expect(page.locator('[data-first-use]')).toHaveCount(0)
})
