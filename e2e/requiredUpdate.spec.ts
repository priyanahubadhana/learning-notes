// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook } from './helpers.ts'

// BUG-004: a required update takes over the whole screen.
const screen = (page: import('@playwright/test').Page) =>
  page.locator('[data-mandatory-update]')

test('a required update blocks the app, can be cancelled, then installs', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('keep me')
  await page.evaluate(() =>
    window.dispatchEvent(new Event('learning-notes:test-required-update')),
  )
  await expect(screen(page)).toBeVisible()
  await expect(screen(page)).toContainText('Update required')
  await expect(screen(page)).toContainText('Downloading starts in')
  // Nothing behind it can be used.
  expect(
    await page.evaluate(() =>
      document.getElementById('root')?.hasAttribute('inert'),
    ),
  ).toBe(true)
  // Cancel stops it; the app stays blocked with a Retry button.
  await screen(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(screen(page)).toHaveAttribute('data-phase', 'paused')
  await page.waitForTimeout(1500)
  await expect(screen(page)).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        (window as never as { __requiredApplied?: boolean }).__requiredApplied,
    ),
  ).toBeFalsy()
  // Retry downloads and installs; the app is told to restart.
  await screen(page).getByRole('button', { name: 'Retry' }).click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as never as { __requiredApplied?: boolean })
            .__requiredApplied,
      ),
    )
    .toBe(true)
  await expect(screen(page)).toContainText('Installing')
})

test('a normal update never shows the full-screen flow', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await page.evaluate(() =>
    window.dispatchEvent(new Event('learning-notes:test-update')),
  )
  await page.waitForTimeout(500)
  await expect(screen(page)).toHaveCount(0)
  await expect(page.locator('[data-update-splash]')).toHaveCount(0)
})
