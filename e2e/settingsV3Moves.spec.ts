// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 section moves: SET-B25 (AI rename) and the Pencil & touch / Help & tour moves (decision 6). */

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

const row = (page: Page, id: string) =>
  page.locator(`[data-setting-id="${id}"]`)

async function open(page: Page, section: string) {
  if (page.url().includes('flags=settings.v3')) {
    // Already inside Settings: only the address changes.
    await page.evaluate((id) => {
      location.hash = `#/settings/${id}`
    }, section)
  } else {
    await page.goto(`/?flags=settings.v3#/settings/${section}`)
    await page.getByRole('button', { name: 'Hide menu' }).click()
  }
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await expect(page.locator(`[data-section="${section}"]`)).toHaveAttribute(
    'aria-current',
    'page',
  )
}

test('SET-B25 the section is named "Let AI use my notebooks"; the old name still finds it', async ({
  page,
}) => {
  await open(page, 'claude')
  await expect(page.locator('[data-section="claude"]')).toContainText(
    'Let AI use my notebooks',
  )
  await expect(page.locator('[data-section="claude"]')).not.toContainText(
    'Claude use my notes',
  )
  await open(page, 'general')
  await page
    .getByRole('searchbox', { name: 'Search settings' })
    .fill('let claude use my notes')
  await expect(page.locator('[data-hit="claude.section"]')).toBeVisible()
  await page.locator('[data-hit="claude.section"]').click()
  await expect(page.locator('[data-section="claude"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('SET-B25 inside "Let AI use my notebooks" Claude is listed first', async ({
  page,
}) => {
  await open(page, 'claude')
  const items = page.locator('[data-testid="sv3-ai-list"] [data-ai]')
  await expect(items.first()).toHaveAttribute('data-ai', 'claude')
  await expect(items.first()).toContainText('Claude')
})

test('Pencil & touch has its own section with the pencil rows, and Advanced no longer lists them', async ({
  page,
}) => {
  await open(page, 'pencil')
  await expect(page.locator('[data-section="pencil"]')).toContainText(
    'Pencil & touch',
  )
  for (const id of [
    'advanced.pencilWrites',
    'advanced.holdSelect',
    'advanced.holdMenu',
    'advanced.pencilTapTwice',
    'advanced.pencilScrolls',
  ])
    await expect(row(page, id)).toBeVisible()
  await page.locator('[data-section="advanced"]').click()
  await expect(row(page, 'advanced.pencilWrites')).toHaveCount(0)
  await expect(row(page, 'advanced.showRefresh')).toBeVisible()
})

test('the tips rows moved to Help & tour; the tool bar rows stay in both places', async ({
  page,
}) => {
  await open(page, 'help')
  await expect(row(page, 'advanced.hoverTips')).toBeVisible()
  await expect(row(page, 'advanced.shortcutHints')).toBeVisible()
  await open(page, 'advanced')
  await expect(row(page, 'advanced.hoverTips')).toHaveCount(0)
  // "Also in": bar placement lives in Tool bar and Advanced.
  await expect(row(page, 'advanced.barPlacement')).toBeVisible()
  await page.locator('[data-section="toolbar"]').click()
  await expect(row(page, 'advanced.barPlacement')).toBeVisible()
  await expect(
    row(page, 'advanced.barPlacement').locator('[data-also-in]'),
  ).toContainText('Advanced')
})

test('the order follows the mock: Your experience, General, Account, Sync, Lock, AI ... Help & tour, Professional features', async ({
  page,
}) => {
  await open(page, 'general')
  const ids = await page
    .locator('[data-section]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-section')))
  expect(ids.slice(0, 5)).toEqual([
    'experience',
    'general',
    'account',
    'sync',
    'lock',
  ])
  expect(ids.indexOf('pencil')).toBe(ids.indexOf('toolbar') + 1)
  expect(ids.slice(-2)).toEqual(['help', 'pro'])
})
