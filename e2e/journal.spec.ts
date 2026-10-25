import { expect, test } from '@playwright/test'
import { sidebar } from './helpers.ts'

// "Today" is fixed so titles and grouping are predictable.
const at = (day: number) => new Date(2026, 9, day, 10, 0)

test('Today creates the day page from the Daily journal template, under its month', async ({
  page,
}) => {
  await page.clock.setFixedTime(at(25))
  await page.goto('/')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()

  await expect(page.getByRole('status')).toContainText(
    'Created today’s page from the “Daily journal” template',
  )
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    /Sunday,? 25 October 2026/,
  )
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }),
  ).toContainText('Journal/October 2026/')
  await expect(page.locator('.bn-editor')).toContainText('Today I learned')
  await expect(
    page.getByText('Today’s journal', { exact: false }),
  ).toBeVisible()

  // Opening today again goes to the same page.
  await sidebar(page).getByRole('button', { name: 'Study notes' }).click()
  await page.keyboard.press('Alt+t')
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    /25 October 2026/,
  )
  await expect(
    sidebar(page).getByRole('button', { name: /25 Oct/ }),
  ).toHaveCount(1)
})

test('journal days are listed newest first', async ({ page }) => {
  await page.clock.setFixedTime(at(24))
  await page.goto('/')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  await expect(
    sidebar(page).getByRole('button', { name: /24 Oct/ }),
  ).toBeVisible()

  await page.clock.setFixedTime(at(25))
  await page.keyboard.press('Alt+t')
  const days = sidebar(page).getByRole('button', { name: /\d+ Oct$/ })
  await expect(days).toHaveText([/25 Oct/, /24 Oct/])
})
