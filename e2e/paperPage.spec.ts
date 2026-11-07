// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * Phase Q steps 1–2: every page is paper. The page's text is one default
 * box on A4 sheets; the paper grows a sheet at a time; zoom changes the
 * paper's width and the text scales with it.
 */

test('a page shows on an A4 sheet with its text in one box; zoom and fit', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Sheet one')
  await typeInEditor(page, 'Hello paper')

  const paper = page.locator('[data-paper]')
  const sheet = page.locator('[data-paper-sheet="1"]')
  const box = page.locator('[data-paper-box="main"]')
  await expect(paper).toHaveAttribute('data-sheet', 'A4')
  await expect(box).toContainText('Hello paper')
  // A4 proportions, and the box sits inside the sheet's margins.
  const s = (await sheet.boundingBox())!
  expect(s.height / s.width).toBeCloseTo(297 / 210, 2)
  const b = (await box.boundingBox())!
  expect(b.x).toBeGreaterThan(s.x)
  expect(b.x + b.width).toBeLessThan(s.x + s.width)
  expect(b.width / s.width).toBeCloseTo(180 / 210, 2)

  // Zoom in: the paper is wider; the % button fits it back.
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByRole('button', { name: 'Fit width' })).toHaveText(
    '125 %',
  )
  const z = (await sheet.boundingBox())!
  expect(z.width / s.width).toBeCloseTo(1.25, 1)
  await page.getByRole('button', { name: 'Fit width' }).click()
  await expect(page.getByRole('button', { name: 'Fit width' })).toHaveText(
    '100 %',
  )

  // Lots of text: a second sheet appears under the first.
  await expect(page.locator('[data-paper-sheet]')).toHaveCount(1)
  await page.locator('.bn-editor').getByText('Hello paper').click()
  await page.keyboard.press('End')
  for (let i = 0; i < 90; i++) await page.keyboard.press('Enter')
  await expect(page.locator('[data-paper-sheet="2"]')).toBeVisible()
})
