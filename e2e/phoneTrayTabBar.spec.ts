import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { barMenu } from './mainBarHelpers.ts'

/**
 * R5 (findings 2026-11-14): on the phone the tool bar ⋯ tray ran under the tab
 * bar, so its last rows sat behind it. Both the old tray and the v8 ⋯ card end
 * above the tab bar, and the last row can be scrolled into view.
 */
test.use({ hasTouch: true, viewport: { width: 390, height: 640 } })

async function open(page: Page, flags: string) {
  await page.addInitScript(
    ([f]) => {
      localStorage.setItem('learning-notes:flags', JSON.stringify(f.split(',')))
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'professional', unlocked: ['tb.allTools'] }),
      )
    },
    [flags],
  )
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const tabBarTop = (page: Page) =>
  page.locator('.sh-tabbar').evaluate((e) => e.getBoundingClientRect().top)

/** The last control of a scrolling panel can be reached and is not covered. */
async function lastRowReachable(
  page: Page,
  panel: string,
  rows: string,
  // A bottom sheet (the v8 card) is above the tab bar by design (F10); a tray is not.
  aboveBar = true,
) {
  await page.waitForTimeout(700)
  const top = aboveBar ? await tabBarTop(page) : 640
  const box = (await page.locator(panel).boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(top + 0.5)
  const last = page.locator(rows).last()
  await last.scrollIntoViewIfNeeded()
  const r = (await last.boundingBox())!
  expect(r.y + r.height).toBeLessThanOrEqual(top + 0.5)
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('button') !== null,
    [r.x + r.width / 2, r.y + r.height / 2],
  )
  expect(hit).toBe(true)
}

test('old tray: ends above the tab bar and the last row scrolls into view', async ({
  page,
}) => {
  await open(page, 'foundation.shell')
  await expect(page.locator('.sh-tabbar')).toBeVisible()
  await barMenu(page).click()
  await expect(page.locator('[data-bar="tray"]')).toBeVisible()
  await lastRowReachable(
    page,
    '[data-bar="tray"]',
    '[data-bar="tray"] button:not([data-popup-close])',
  )
})

test('v8 ⋯ card: ends above the tab bar and the last row scrolls into view', async ({
  page,
}) => {
  await open(page, 'foundation.shell,toolbar.v8')
  await expect(page.locator('.sh-tabbar')).toBeVisible()
  await page.getByTestId('v8-more').click()
  await expect(page.getByTestId('v8-card-fold.bar')).toBeVisible()
  await lastRowReachable(
    page,
    '[data-testid="v8-card-fold.bar"]',
    '[data-testid="v8-card-fold.bar"] button:not([data-testid="pcard-close"])',
    false,
  )
})

test('v8 ⋯ card with the new ⋯ look: same rule', async ({ page }) => {
  await open(page, 'foundation.shell,toolbar.v8,toolbar.menu')
  await page.getByTestId('v8-more').click()
  await expect(page.getByTestId('v8-card-fold.bar')).toBeVisible()
  await lastRowReachable(
    page,
    '[data-testid="v8-card-fold.bar"]',
    '[data-testid="v8-card-fold.bar"] button:not([data-testid="pcard-close"])',
    false,
  )
})
