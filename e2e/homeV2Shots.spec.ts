// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { closeCorner } from './helpers.ts'

/**
 * SHOTS-only helper for gate 3 (Home v2, flag `home.v2`): Edit mode, the More
 * sheet, Beginner level and the running timer, at phone / iPad portrait / PC
 * in light, dark and sepia. Run with SHOTS=1; without it the test is skipped.
 */
const SHOTS = process.env.SHOTS
const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-portrait': { width: 820, height: 1180 },
  pc: { width: 1336, height: 900 },
} as const
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const

async function shoot(page: Page, name: string, size: string) {
  for (const [label, attr] of Object.entries(THEMES)) {
    await page.evaluate(
      (v) => document.documentElement.setAttribute('data-theme', v),
      attr,
    )
    await page.waitForTimeout(200)
    await page.screenshot({
      path: `screenshots/gate3-5/after-${name}-${size}-${label}.png`,
    })
  }
}

async function seed(page: Page, level: string) {
  await page.addInitScript((lv) => {
    if (!sessionStorage.getItem('lvl-set')) {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: lv, unlocked: [] }),
      )
      sessionStorage.setItem('lvl-set', '1')
    }
  }, level)
}

async function openHome(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size)
  await page.goto('/?flags=home.v2')
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  const tasks = [
    'Revise organic chemistry ch. 4',
    'Finish physics problem set',
    'Read two pages of the history book',
    'Email the study group',
    'Plan next week',
  ]
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  for (const t of tasks) {
    await page.getByTestId('quick-add').fill(t)
    await page.getByTestId('quick-add').press('Enter')
  }
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  const top3 = page.getByTestId('top3')
  for (const t of tasks.slice(0, 3)) {
    await top3.getByTestId('top3-add').click()
    await top3.getByRole('button', { name: t, exact: true }).click()
  }
  await expect(
    page.getByTestId('home-widgets').locator('> li[data-reorder-id]'),
  ).not.toHaveCount(0)
}

for (const [size, vp] of Object.entries(SIZES)) {
  test.describe(`home shots ${size}`, () => {
    test.skip(!SHOTS, 'pictures only')

    test('edit mode, running timer, more sheet', async ({ page }) => {
      await seed(page, 'professional')
      await openHome(page, vp)
      await page.getByTestId('timer-toggle').click()
      await expect(page.getByTestId('timer-chip')).toBeVisible()
      await page.waitForTimeout(2200)
      await page.evaluate(() =>
        document.querySelectorAll('*').forEach((e) => (e.scrollTop = 0)),
      )
      await shoot(page, 'timer-running', size)
      await page.getByTestId('home-edit').click()
      await expect(page.getByTestId('home-edit-bar')).toBeVisible()
      await shoot(page, 'edit', size)
      await page
        .getByTestId('home-edit-bar')
        .getByRole('button', { name: 'Done' })
        .click()
      await expect(page.getByTestId('home-edit-bar')).toHaveCount(0)
      await page.keyboard.press('Escape')
      await page.getByTestId('corner-button').click()
      await expect(page.getByTestId('corner-panel')).toBeVisible()
      await page.waitForTimeout(300)
      await shoot(page, 'more', size)
    })

    test('beginner level', async ({ page }) => {
      await seed(page, 'beginner')
      await openHome(page, vp)
      await shoot(page, 'beginner', size)
    })
  })
}
