/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { startInMode } from './helpers.ts'

/**
 * F8: the bar slot keeps the tool bar's height before the bar draws (see
 * src/editor/BarRoom.tsx), but never where no bar shows: Home, Settings,
 * Library, a floating bar, no bar, a bar at the bottom.
 */
const ON = 'foundation.shell,toolbar.v8'

async function noRoom(
  page: Page,
  hash: string,
  keys: Record<string, string> = {},
) {
  await startInMode(page, 'touch')
  await page.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries))
      localStorage.setItem('learning-notes:' + k, JSON.stringify(v))
  }, keys)
  await page.goto(`/?flags=${ON}${hash}`)
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  for (const wait of [0, 1500]) {
    await page.waitForTimeout(wait)
    expect(await page.locator('[data-bar-room]').count()).toBe(0)
    const slot = await page
      .locator('[data-bar-slot]')
      .evaluate((s) => Math.round(s.getBoundingClientRect().height))
    expect(slot).toBe(0)
  }
}

test('Home keeps no room for a bar', async ({ page }) => {
  await noRoom(page, '#/')
})
test('Settings keeps no room for a bar', async ({ page }) => {
  await noRoom(page, '#/settings')
})
test('Library keeps no room for a bar', async ({ page }) => {
  await noRoom(page, '#/library')
})
test('the bar turned off keeps no room', async ({ page }) => {
  await noRoom(page, '#/', { 'advanced.barPlacement': 'floating' })
})
