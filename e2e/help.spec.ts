import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  makeCard,
  openSidebar,
  cornerAction,
  openCorner,
  setTheme,
} from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

test('Show help: tips across the app, help lines, and nothing when Off', async ({
  page,
}) => {
  // A help line under the page title (marked for review).
  await expect(page.locator('[data-help-line="page.editor"]')).toBeVisible()

  // Hover tips on sidebar buttons, with a meaning and an example.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: /^Search/ })
    .hover()
  const tip = page.getByRole('tooltip')
  await expect(tip).toContainText('Finds words in all your notes')
  await expect(tip).toContainText('Example:')
  // A tip on a hover-only row action.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Heart sounds', exact: true })
    .hover()
  await (await openSidebar(page)).getByLabel('Add sub-page').hover()
  await expect(page.getByRole('tooltip')).toContainText('Adds a page inside')

  // The Review screen: the Show answer button does not pop a tip by itself.
  await makeCard(page, 'Which valves close in S1?', 1)
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: /^Review(?! this)/ })
    .click()
  await expect(page.getByRole('button', { name: /Show answer/ })).toBeFocused()
  await page.mouse.move(0, 0) // a resting mouse is a hover, not a focus tip
  await page.waitForTimeout(700)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await page.keyboard.press('Space')
  await expect(page.locator('[data-help-line="review.ratings"]')).toBeVisible()
  await page.getByRole('button', { name: 'Close review' }).click()

  // Keyboard: Tab onto a button shows its tip.
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: /^Search/ })
    .focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('tooltip')).toBeVisible()

  // Off: no tips, no help lines, no native hover text left behind.
  await cornerAction(page, 'Settings')
  await main(page)
    .getByRole('group', { name: 'Show help' })
    .getByRole('button', { name: 'Off' })
    .click()
  await expect(page.locator('[data-tip]')).toHaveCount(0)
  // The layout does not change: theme buttons stay small, no sideways scroll.
  const day = (await openCorner(page)).getByRole('button', {
    name: 'Day',
    exact: true,
  })
  expect((await day.boundingBox())!.height).toBeLessThan(50)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  const sideBox = (await openSidebar(page).then((s) => s.boundingBox()))!
  expect(
    await openSidebar(page).then((s) =>
      s.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ),
  ).toBe(true)
  expect(sideBox.width).toBeGreaterThan(100)
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: /^Search/ })
    .hover()
  await page.waitForTimeout(700)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(page.locator('[data-help-line]')).toHaveCount(0)
  await expect(page.locator('aside [title]')).toHaveCount(0)

  // On again (and kept after a reload: it is a device setting).
  await main(page)
    .getByRole('group', { name: 'Show help' })
    .getByRole('button', { name: 'On' })
    .click()
  await page.reload()
  await expect(page.locator('[data-tip]').first()).toBeAttached()
})

test.describe('touch', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true })

  test('on a phone the ⓘ opens a tip; tapping elsewhere closes it', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'What is this?' }).first().tap()
    const tip = page.getByRole('tooltip')
    await expect(tip).toBeVisible()
    await expect(tip).toContainText('Example:')
    await page.getByRole('heading').first().tap()
    await expect(tip).toHaveCount(0)
  })
})

for (const theme of ['Day', 'Night', 'Sepia'] as const) {
  test(`screenshot: a hover tip in ${theme}`, async ({ page }) => {
    await setTheme(page, theme)
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name: /^Search/ })
      .hover()
    await expect(page.getByRole('tooltip')).toBeVisible()
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/help-tip-${theme}.png`,
    })
  })
}
