// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { caretAtEnd, openV8, stubClipboard } from './c0Clipboard.ts'

/**
 * Check C0 on a computer with a keyboard (chromium only: an iPad is never one).
 * C0-3: a mouse over Paste shows its name like the other buttons. C0-4: a
 * refused paste keeps the shortcut words there.
 */
test.use({ viewport: { width: 1024, height: 900 } })

test('C0-3 with a mouse, Paste shows its name like the other buttons (computer)', async ({
  page,
}) => {
  await stubClipboard(page, 'allowed')
  await openV8(page, 'computer')
  await page.getByTestId('top-paste').locator('[data-action="paste"]').hover()
  await expect(page.locator('[data-hover-name]')).toHaveText('Paste')
})

test('C0-4 a computer with a keyboard keeps the shortcut words', async ({
  page,
}) => {
  await stubClipboard(page, 'refused')
  await openV8(page, 'computer')
  await caretAtEnd(page)
  await page.getByTestId('top-paste').locator('[data-action="paste"]').click()
  await expect(page.getByText(/Ctrl\+Shift\+V/)).toBeVisible()
})
