// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, dockedBar, startInMode } from './helpers.ts'

/**
 * Batch 2f: a bar or the "Show tool bar" button is always on screen, in every
 * mode, and an iPad that calls itself a Mac starts in Touch mode.
 */

for (const mode of ['computer', 'touch', 'pencil'] as const) {
  test(`${mode}: the short bar shows at first`, async ({ page }) => {
    await startInMode(page, mode)
    await page.goto('/')
    await createNotebook(page, 'Cardiology', 'Heart sounds')
    await expect(dockedBar(page)).toBeVisible()
  })

  test(`${mode}: a bar left off by an older version is repaired`, async ({
    page,
  }) => {
    await startInMode(page, mode)
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem(
        'learning-notes:advanced.barPlacement',
        JSON.stringify('floating'),
      )
    })
    await page.goto('/')
    await createNotebook(page, 'Cardiology', 'Heart sounds')
    await expect(dockedBar(page)).toBeVisible()
  })

  test(`${mode}: a bar turned off keeps the Show tool bar button`, async ({
    page,
  }) => {
    await startInMode(page, mode)
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem(
        'learning-notes:advanced.barPlacement',
        JSON.stringify('floating'),
      )
      localStorage.setItem('learning-notes:toolbar.turnedOff', 'true')
    })
    await page.goto('/')
    await createNotebook(page, 'Cardiology', 'Heart sounds')
    await expect(dockedBar(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Show tool bar' }).click()
    await expect(dockedBar(page)).toBeVisible()
  })
}

test.describe('an iPad that says it is a Mac', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
    isMobile: true,
    storageState: { cookies: [], origins: [] },
  })

  test('starts in Touch mode with the bar showing', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' })
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Use this' }).click()
    expect(
      await page.evaluate(() =>
        localStorage.getItem('learning-notes:general.deviceMode'),
      ),
    ).toBe('"touch"')
    await createNotebook(page, 'Cardiology', 'Heart sounds')
    await expect(dockedBar(page)).toBeVisible()
  })
})
