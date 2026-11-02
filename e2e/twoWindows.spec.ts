import { expect, test } from '@playwright/test'
import { createNotebook } from './helpers.ts'

test('a second window on a page is read-only until Edit here', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'Shared page')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('from A')
  await page.waitForTimeout(800)

  const second = await context.newPage()
  await second.goto(page.url())
  const banner = second
    .getByRole('status')
    .filter({ hasText: 'another window' })
  await expect(banner).toBeVisible()
  await expect(second.locator('.bn-editor')).toContainText('from A')
  await expect(second.locator('.bn-editor')).toHaveAttribute(
    'contenteditable',
    'false',
  )

  // A keeps editing; the second window takes over and sees it all.
  await page.bringToFront()
  await page.keyboard.type(' and more')
  await second.bringToFront()
  await banner.getByRole('button', { name: 'Edit here' }).click()
  await expect(banner).toHaveCount(0)
  await expect(second.locator('.bn-editor')).toContainText('from A and more')
  await second.locator('.bn-editor').click()
  await second.keyboard.press('Control+End')
  await second.keyboard.type(' then B')
  await second.waitForTimeout(800)

  // The first window is now the read-only one, and nothing was overwritten.
  await expect(
    page.getByRole('status').filter({ hasText: 'another window' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.locator('.bn-editor')).toContainText(
    'from A and more then B',
  )
})
