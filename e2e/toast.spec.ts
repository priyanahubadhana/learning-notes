import { expect, test } from '@playwright/test'

const today = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Open today’s journal' })

test('a message closes by itself after a few seconds', async ({ page }) => {
  await page.goto('/')
  await today(page).click()
  const toast = page.getByRole('status')
  await expect(toast).toBeVisible()
  // About 60 characters: roughly 4.5 s.
  await expect(toast).toBeHidden({ timeout: 7000 })
})

test('hovering a message keeps it open; leaving lets it close', async ({
  page,
}) => {
  await page.goto('/')
  await today(page).click()
  const toast = page.getByRole('status')
  await expect(toast).toBeVisible()
  await toast.hover()
  await page.waitForTimeout(5500)
  await expect(toast).toBeVisible()
  await page.mouse.move(5, 5)
  await expect(toast).toBeHidden({ timeout: 4000 })
})
