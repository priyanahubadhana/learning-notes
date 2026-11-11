import { expect, test } from '@playwright/test'
import { createNotebook } from './helpers.ts'

test('a video card has a start time and a size', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/video')
  await page.keyboard.press('Enter')
  const address = page.getByRole('textbox', { name: /address/i })
  await address.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await address.press('Enter')
  const card = page.locator('[data-embed="youtube"]')
  await expect(card).toBeVisible()
  const full = (await card.boundingBox())!.width
  await card.getByRole('textbox', { name: 'Start at' }).fill('1:30')
  await card.getByRole('textbox', { name: 'Start at' }).press('Enter')
  await expect(card).toContainText('1:30')
  await card.locator('[data-video-size="s"]').click()
  await expect
    .poll(async () => (await card.boundingBox())!.width)
    .toBeLessThan(full * 0.6)
  await card.locator('[data-video-size="l"]').click()
  await expect
    .poll(async () => (await card.boundingBox())!.width)
    .toBeGreaterThan(full * 0.95)
})
