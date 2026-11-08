import { expect, test } from '@playwright/test'
import { createNotebook } from './helpers.ts'

test('optional page tabs: off by default, switched on from the ⋯ and kept', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Mine', 'First')
  const row = page.locator('[data-page-tabs]')
  await expect(row.getByRole('button')).toHaveCount(3)
  await page.locator('[data-page-tabs-menu]').click()
  await page.getByText('Audio & video', { exact: true }).click()
  await page.keyboard.press('Escape')
  await page.locator('[data-page-tabs-menu]').click()
  await page.getByText('Database', { exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(row.getByRole('button')).toHaveCount(5)

  await row.getByRole('button', { name: 'Database' }).click()
  await expect(page.locator('[data-database-tab]')).toContainText(
    'No databases here yet.',
  )
  await expect(
    page.getByRole('button', { name: 'The whole notebook' }),
  ).toBeVisible()

  await row.getByRole('button', { name: 'Audio & video' }).click()
  await expect(page.locator('[data-audio-tab]')).toContainText(
    'No audio or video',
  )

  // The choice is kept after a reload.
  await page.reload()
  await expect(
    page
      .locator('[data-page-tabs]')
      .getByRole('button', { name: 'Audio & video' }),
  ).toBeVisible()
})

test('Mind map tab: nothing to build from without headings', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Mine', 'First')
  await page.locator('[data-page-tabs-menu]').click()
  await page.getByText('Mind map', { exact: true }).click()
  await page.keyboard.press('Escape')
  await page
    .locator('[data-page-tabs]')
    .getByRole('button', { name: 'Mind map' })
    .click()
  await page.getByRole('button', { name: 'Make one from the headings' }).click()
  await expect(page.getByText('Add headings to the page first')).toBeVisible()
})
