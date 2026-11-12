// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 hidden Try new features: SET-B26. */

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

const BEGINNER = JSON.stringify({ level: 'beginner', unlocked: [] })
const flagRows = (page: Page) => page.locator('[data-setting-id^="tryNew."]')

async function open(page: Page, section = 'help', level = BEGINNER) {
  await page.addInitScript((v) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('learning-notes:level', v)
      sessionStorage.setItem('seeded', '1')
    }
  }, level)
  await page.goto(`/?flags=settings.v3#/settings/${section}`)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await page.waitForLoadState('networkidle')
}

test('SET-B26 Try new features is not shown, not in the list and not found by search', async ({
  page,
}) => {
  await open(page, 'general')
  await expect(page.locator('[data-section="tryNew"]')).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('beta')
  await expect(page.locator('[data-hit^="tryNew."]')).toHaveCount(0)
})

test('SET-B26 tapping Version five times opens the list: one switch per flag, a risk note and Turn all off', async ({
  page,
}) => {
  await open(page)
  const tap = page.locator('[data-version-tap]')
  // The Version row and its tap target stay in Beginner.
  await expect(tap).toBeVisible()
  for (let i = 0; i < 4; i++) await tap.click()
  await expect(page.locator('[data-section="tryNew"]')).toHaveCount(0)
  await tap.click()
  await expect(page.locator('[data-section="tryNew"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.locator('[data-section="tryNew"]')).toContainText(
    'Try new features',
  )
  await expect(page.locator('[data-try-new-header]')).toContainText(
    'still being built',
  )
  // One switch per slice flag (the same flags as today's Try new features).
  expect(await flagRows(page).count()).toBeGreaterThanOrEqual(24)
  await expect(
    page.locator('[data-setting-id="tryNew.settings.v3"]'),
  ).toBeVisible()
  await expect(flagRows(page).first()).toContainText('Early version')
  await expect(page.locator('[data-try-new-off]')).toBeVisible()
})

test('SET-B26 typing "try new features" in search opens the same list', async ({
  page,
}) => {
  await open(page, 'general')
  await page
    .getByRole('searchbox', { name: 'Search settings' })
    .fill('try new features')
  await expect(page.locator('[data-section="tryNew"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(
    page.getByRole('searchbox', { name: 'Search settings' }),
  ).toHaveValue('')
  await expect(flagRows(page).first()).toBeVisible()
})

test('SET-B26 Turn all off switches every flag off in one Undo step', async ({
  page,
}) => {
  await open(page)
  const tap = page.locator('[data-version-tap]')
  for (let i = 0; i < 5; i++) await tap.click()
  const media = page.locator('[data-setting-id="tryNew.media.v2"]')
  const menus = page.locator('[data-setting-id="tryNew.page.menus"]')
  await media.getByRole('radio', { name: 'On' }).click()
  await menus.getByRole('radio', { name: 'On' }).click()
  const stored = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem('learning-notes:flags') ?? '[]'),
    )
  expect(await stored()).toEqual(
    expect.arrayContaining(['media.v2', 'page.menus']),
  )
  await page.locator('[data-try-new-off]').click()
  await expect(page.getByText('2 new features turned off')).toBeVisible()
  await expect(media.getByRole('radio', { name: 'Off' })).toBeChecked()
  expect(await stored()).not.toContain('media.v2')
  await page.getByTestId('sv3-undo').click()
  await expect(media.getByRole('radio', { name: 'On' })).toBeChecked()
  await expect(menus.getByRole('radio', { name: 'On' })).toBeChecked()
})
