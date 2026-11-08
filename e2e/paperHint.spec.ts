// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/** Polish 2 item 8: the empty paper shows that a tap makes a box. */

test('an empty page hints at the tap; hover shows "+ box"; typing removes the hint', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Hint', 'One')
  const hint = page.locator('[data-paper-hint]')
  await expect(hint).toBeVisible()
  await expect(hint).toContainText('tap anywhere on the paper')

  // Hovering empty paper shows the "+ box" tag beside the pointer.
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const y = main.y + main.height + 60
  await page.mouse.move(sheet.x + sheet.width * 0.5, y)
  await page.mouse.move(sheet.x + sheet.width * 0.5 + 4, y + 4)
  await expect(page.locator('[data-paper-addbox]')).toHaveText('+ box')
  // Over the page's own text there is no tag.
  await page.mouse.move(main.x + 20, main.y + 10)
  await expect(page.locator('[data-paper-addbox]')).toHaveCount(0)

  await typeInEditor(page, 'Hello')
  await expect(hint).toHaveCount(0)
})

test('the hint is only on the first three pages', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Hint', 'One')
  await expect(page.locator('[data-paper-hint]')).toBeVisible()
  await addPage(page, 'Hint', 'Two')
  await expect(page.locator('[data-paper-hint]')).toBeVisible()
  await addPage(page, 'Hint', 'Three')
  await expect(page.locator('[data-paper-hint]')).toBeVisible()
  await addPage(page, 'Hint', 'Four')
  await expect(page.locator('[data-paper-sheet="1"]')).toBeVisible()
  await expect(page.locator('[data-paper-hint]')).toHaveCount(0)
})
