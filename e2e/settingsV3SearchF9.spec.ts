// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * F9 (docs/plans/ipad-test-findings-2026-11-14.md): the existing "Search
 * settings" box stays in reach on every Settings section (also after
 * scrolling a long one) and finds the Try new features switches.
 */
const box = (page: Page) =>
  page.getByRole('searchbox', { name: 'Search settings' })

async function open(page: Page, section: string, tryNew = false) {
  await page.addInitScript((on) => {
    if (on) sessionStorage.setItem('learning-notes:v3.tryNew', '1')
  }, tryNew)
  await page.goto(`/?flags=settings.v3#/settings/${section}`)
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await page.waitForLoadState('networkidle')
}

test.describe('iPad landscape', () => {
  test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

  for (const section of [
    'experience',
    'general',
    'account',
    'sync',
    'lock',
    'ai',
    'connections',
    'permissions',
    'claude',
    'toolbar',
    'pencil',
    'reading',
    'review',
    'journal',
    'advanced',
    'help',
    'pro',
  ]) {
    test(`F9 the search box stays at the top after scrolling ${section}`, async ({
      page,
    }) => {
      await open(page, section)
      const el = box(page)
      await expect(el).toBeVisible()
      await page.evaluate(() => {
        for (const e of document.querySelectorAll('*'))
          if (e.scrollHeight > e.clientHeight + 50) e.scrollTop = 99999
        window.scrollTo(0, 99999)
      })
      await page.waitForTimeout(300)
      const b = await el.boundingBox()
      expect(b).not.toBeNull()
      expect(b!.y).toBeGreaterThanOrEqual(0)
      expect(b!.y + b!.height).toBeLessThan(200)
    })
  }

  test('F9 search finds the advanced options by name', async ({ page }) => {
    await open(page, 'general')
    await box(page).fill('Tool state')
    const hit = page.locator('[data-hit]').first()
    await expect(hit).toContainText('Tool state')
    await expect(hit.locator('.sv3-hit-section')).toHaveText('Advanced')
  })

  test('F9 the sticky search bar is as wide as the content and the field stops at 560', async ({
    page,
  }) => {
    await open(page, 'general')
    const bar = await page.locator('.sv3-search').boundingBox()
    const field = await page.locator('.sv3-search .clr-wrap').boundingBox()
    expect(field!.width).toBeLessThanOrEqual(561)
    expect(bar!.width).toBeGreaterThan(field!.width)
  })

  test('F9 search finds a Try new features switch by name and plain words', async ({
    page,
  }) => {
    await open(page, 'general', true)
    await box(page).fill('New Search')
    await expect(page.locator('[data-hit="tryNew.search.v2"]')).toBeVisible()
    await box(page).fill('tool bar')
    await expect(page.locator('[data-hit^="tryNew."]').first()).toBeVisible()
  })
})
