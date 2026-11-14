import { expect, test } from '@playwright/test'
import { createNotebook, openSearchPopup, typeInEditor } from './helpers.ts'

/**
 * F5 (docs/plans/ipad-test-findings-2026-11-14.md): the search pop-up closes
 * and clears by touch. A ✕ inside the field clears the text; a visible ✕ beside
 * it closes the pop-up; Esc still closes with a keyboard; no red "Esc" text and
 * (on touch) no keyboard-hint footer.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/?flags=search.v2')
  await createNotebook(page, 'Biology', 'Cells')
  await typeInEditor(page, 'The nucleus holds DNA')
  await page.waitForTimeout(700)
})

test('F5 the ✕ in the field clears the typed text and keeps the pop-up open', async ({
  page,
}) => {
  const popup = await openSearchPopup(page)
  const box = popup.getByRole('combobox')
  await box.fill('nucleus')
  await popup.getByRole('button', { name: /^Clear/ }).click()
  await expect(box).toHaveValue('')
  await expect(popup).toBeVisible()
})

test('F5 a visible ✕ beside the field closes the pop-up, 44 pt, no "Esc" text', async ({
  page,
}) => {
  const popup = await openSearchPopup(page)
  const close = popup.getByRole('button', { name: 'Close search' })
  await expect(close).toBeVisible()
  await expect(close).not.toContainText('Esc')
  const b = await close.boundingBox()
  expect(b!.width).toBeGreaterThanOrEqual(44)
  expect(b!.height).toBeGreaterThanOrEqual(44)
  await close.click()
  await expect(popup).toBeHidden()
})

test('F5 Esc still closes with a keyboard', async ({ page }) => {
  const popup = await openSearchPopup(page)
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
})

test('F5 the keyboard-hint footer shows only without touch', async ({
  page,
}, info) => {
  const popup = await openSearchPopup(page)
  const touch = info.project.name.includes('ipad')
  const kbd = popup.locator('kbd', { hasText: 'Esc' })
  if (touch) await expect(kbd).toBeHidden()
  else await expect(kbd).toBeVisible()
})
