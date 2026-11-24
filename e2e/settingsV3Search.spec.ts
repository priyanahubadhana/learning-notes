// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 search: SET-B05, B06 and the ✕ field (B45 for the search box). */

const V3 = '/?flags=settings.v3#/settings/general'
const box = (page: Page) =>
  page.getByRole('searchbox', { name: 'Search settings' })

test.describe('iPad landscape search', () => {
  test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })
  test.beforeEach(async ({ page }) => {
    await page.goto(V3)
    await page.getByRole('button', { name: 'Hide menu' }).click()
    await expect(box(page)).toBeVisible()
  })

  test('SET-B05 matches by name, help or plain words, across sections, with the section name', async ({
    page,
  }) => {
    await box(page).fill('ribbon')
    const hits = page.locator('[data-hit]')
    await expect(hits.first()).toBeVisible()
    expect(await hits.count()).toBeGreaterThan(1)
    await expect(page.locator('.sv3-hit-section').first()).not.toBeEmpty()
    // "Tool bar" settings are found by a word they only carry as a keyword.
    const sections = await page.locator('.sv3-hit-section').allInnerTexts()
    expect(sections).toContain('Tool bar')
  })

  test('SET-B05 nothing matches: a plain line and a tip; the X clears the box', async ({
    page,
  }) => {
    await box(page).fill('qqqzzz')
    await expect(page.locator('[data-search-empty]')).toContainText(
      'No settings match',
    )
    await expect(page.locator('[data-search-empty]')).toContainText(
      'Try a shorter',
    )
    const x = page.getByRole('button', { name: 'Clear Search settings' })
    const b = (await x.boundingBox())!
    expect(b.width).toBeGreaterThanOrEqual(40)
    await x.click()
    await expect(box(page)).toHaveValue('')
    await expect(page.locator('[data-search-empty]')).toHaveCount(0)
    await expect(page.locator('[data-setting-id]').first()).toBeVisible()
  })

  test('SET-B06 a result opens its section, scrolls to the row and the row glows', async ({
    page,
  }) => {
    await box(page).fill('scheduler')
    await page.locator('[data-hit="review.scheduler"]').click()
    await expect(page.locator('[data-section="review"]')).toHaveAttribute(
      'aria-current',
      'page',
    )
    const row = page.locator('[data-setting-id="review.scheduler"]')
    await expect(row).toBeVisible()
    await expect(row).toHaveAttribute('data-glow', 'on')
    await expect(box(page)).toHaveValue('')
  })

  test('SET-B06 account items (search only) are found and open their section', async ({
    page,
  }) => {
    await box(page).fill('recovery code')
    await expect(page.locator('[data-hit="account.newCode"]')).toBeVisible()
    await page.locator('[data-hit="account.newCode"]').click()
    await expect(page.locator('[data-section="account"]')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

test.describe('phone search', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })

  test('SET-B05 works on a phone too', async ({ page }) => {
    await page.goto(V3)
    await box(page).fill('glass')
    await expect(page.locator('[data-hit="general.reduceGlass"]')).toBeVisible()
    await page.locator('[data-hit="general.reduceGlass"]').tap()
    await expect(
      page.locator('[data-setting-id="general.reduceGlass"]'),
    ).toHaveAttribute('data-glow', 'on')
  })
})
