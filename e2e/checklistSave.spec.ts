import { expect, test } from '@playwright/test'
import { createNotebook } from './helpers.ts'

// BUG-001: a checklist line made the page save fail (a database transaction
// closed too early), so "Not saved yet" showed and "Try again" never helped.
test('turning a line into a checklist saves without the Not saved bar', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/check')
  await page.keyboard.press('Enter')
  await page.keyboard.type('buy milk')
  await page.waitForTimeout(1500)
  await expect(
    page.getByRole('alert').filter({ hasText: 'Not saved yet' }),
  ).toHaveCount(0)
})
