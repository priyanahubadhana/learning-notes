import { expect, test } from '@playwright/test'
import { openGroup, sidebar } from './helpers.ts'

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
  await expect(page.getByText('Today’s journal', { exact: true })).toBeVisible()

  // Opening today again goes to the same page.
  await openGroup(page, 'Templates')
  await sidebar(page).getByRole('button', { name: 'Study notes' }).click()
  await page.keyboard.press('Alt+t')
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    /25 October 2026/,
  )
  await expect(
    sidebar(page).getByRole('button', { name: /^(?!More for|Delete).*25 Oct/ }),
  ).toHaveCount(1)
})

test('journal days are listed newest first', async ({ page }) => {
  await page.clock.setFixedTime(at(24))
  await page.goto('/')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  await expect(
    sidebar(page).getByRole('button', { name: /^(?!More for|Delete).*24 Oct/ }),
  ).toBeVisible()

  await page.clock.setFixedTime(at(25))
  await page.keyboard.press('Alt+t')
  const days = sidebar(page).getByRole('button', { name: /\d+ Oct$/ })
  await expect(days).toHaveText([/25 Oct/, /24 Oct/])
})

test('a renamed month keeps its new name in the sidebar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  const side = sidebar(page)
  const month = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  await side.getByRole('button', { name: month, exact: true }).dblclick()
  const field = side.getByRole('textbox').first()
  await field.fill('My exam month')
  await field.press('Enter')
  await expect(
    side.getByRole('button', { name: 'My exam month', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    side.getByRole('button', { name: 'My exam month', exact: true }),
  ).toBeVisible()
})
