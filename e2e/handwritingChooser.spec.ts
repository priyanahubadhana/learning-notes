import { expect, test, type Page } from '@playwright/test'
import { openNote, option, pill, tool } from './mainBarHelpers.ts'

/**
 * Polish 2, item 10: Insert › Handwriting explains the three ways to turn
 * handwriting into text, and each choice opens its own tool.
 */

test.use({ viewport: { width: 1024, height: 768 } })

const chooser = (page: Page) => page.getByTestId('handwriting-chooser')

async function openChooser(page: Page) {
  await openNote(page, 'touch')
  await tool(page, 'Insert').click()
  await option(page, 'Handwriting').click()
  await expect(chooser(page)).toBeVisible()
}

test('three choices, each in one line', async ({ page }) => {
  await openChooser(page)
  await expect(chooser(page).locator('[data-choice]')).toHaveCount(3)
  await expect(chooser(page)).toContainText('Write in a pad (Write pad)')
  await expect(chooser(page)).toContainText(
    'Convert ink I already wrote (Lasso)',
  )
  await expect(chooser(page)).toContainText(
    'Write straight into text (Scribble, iPad)',
  )
  await page.keyboard.press('Escape')
  await expect(chooser(page)).toHaveCount(0)
})

test('Write pad opens the pad', async ({ page }) => {
  await openChooser(page)
  await chooser(page).locator('[data-choice="pad"]').click()
  await expect(page.locator('[data-write-pad]')).toBeVisible()
})

test('Convert ink picks the Lasso', async ({ page }) => {
  await openChooser(page)
  await chooser(page).locator('[data-choice="lasso"]').click()
  await expect(tool(page, 'Lasso')).toHaveAttribute('aria-pressed', 'true')
  await expect(pill(page, 'lasso')).toBeVisible()
})

test('Scribble picks Text and offers to turn Scribble on', async ({ page }) => {
  await openChooser(page)
  await chooser(page).locator('[data-choice="scribble"]').click()
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Scribble is off')).toBeVisible()
})
