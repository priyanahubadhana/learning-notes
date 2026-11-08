// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, solidPng } from './helpers.ts'

/** iPad fix 5: a selected picture shows an action bar above it. */
test.use({ viewport: { width: 1100, height: 1000 }, hasTouch: true })

async function pageWithPicture(page: Page) {
  const png = await solidPng(400, 200)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .getByTestId('picture-input-photos')
    .setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Place picture' }).click()
  const img = page.locator('.bn-editor img')
  await expect(img).toBeVisible()
  await expect
    .poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0)
}

const act = (page: Page, id: string) =>
  page.locator(`[data-picture-action="${id}"]`)

test('tap a picture: action bar above it; Duplicate, Resize, Deselect, Delete', async ({
  page,
}) => {
  await pageWithPicture(page)
  const img = page.locator('.bn-editor img').first()
  await img.click()
  const bar = page.locator('[data-picture-actions]')
  await expect(bar).toBeVisible()
  const b = (await bar.boundingBox())!
  const i = (await img.boundingBox())!
  expect(b.y + b.height).toBeLessThanOrEqual(i.y + 1) // above the picture
  for (const id of ['copy', 'cut', 'duplicate', 'delete', 'resize', 'deselect'])
    await expect(act(page, id)).toBeVisible()

  await act(page, 'resize').click()
  await expect(page.locator('[data-picture-handle="se"]')).toHaveCount(0)
  await act(page, 'resize').click()
  await expect(page.locator('[data-picture-handle="se"]')).toBeVisible()

  await act(page, 'duplicate').click()
  await expect(page.locator('.bn-editor img')).toHaveCount(2)

  await act(page, 'deselect').click()
  await expect(bar).toHaveCount(0)

  await page.locator('.bn-editor img').first().click()
  await act(page, 'delete').click()
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
  await expect(bar).toHaveCount(0)
})
