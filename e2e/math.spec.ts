// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Phase N1: the maths block and its editor (KaTeX loads only when used). */

async function insertFormula(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/formula')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-math-block]')).toBeVisible()
}

const editor = (page: Page) => page.locator('[data-math-editor]')

test('KaTeX and its fonts are not loaded until a formula is on the page', async ({
  page,
}) => {
  const files: string[] = []
  page.on('request', (r) => files.push(r.url()))
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('plain words')
  await page.waitForTimeout(500)
  expect(files.filter((u) => /katex|MathHost|MathEditor/i.test(u))).toEqual([])
})

test('build a formula with the buttons and LaTeX; it survives a reload', async ({
  page,
}) => {
  await insertFormula(page)
  await expect(page.getByText('Tap to add a formula')).toBeVisible()
  await page.locator('[data-math-block]').click()
  await expect(editor(page)).toBeVisible()

  // A fraction button writes the LaTeX; the cursor is in the first slot.
  await editor(page).getByRole('button', { name: '\\frac{}{}' }).click()
  await page.keyboard.type('x+1')
  await expect(editor(page).getByRole('textbox')).toHaveValue('\\frac{x+1}{}')
  await expect(editor(page).locator('.katex').first()).toBeVisible()

  // Greek tab: alpha is added at the cursor.
  await editor(page).getByRole('button', { name: 'Greek' }).click()
  await editor(page).getByRole('button', { name: '\\alpha' }).click()
  await expect(editor(page).getByRole('textbox')).toHaveValue(
    '\\frac{x+1\\alpha }{}',
  )
  await editor(page).getByRole('textbox').fill('\\frac{a}{b}=\\alpha')
  await editor(page).getByRole('button', { name: 'Done' }).click()
  await expect(editor(page)).toHaveCount(0)
  await expect(page.locator('[data-math-block] .katex')).toBeVisible()

  await page.waitForTimeout(1200)
  await page.reload()
  await expect(page.locator('[data-math-block] .katex')).toBeVisible()
})

test('Cancel and Esc keep the old formula; a broken formula shows as an error', async ({
  page,
}) => {
  await insertFormula(page)
  await page.locator('[data-math-block]').click()
  await editor(page).getByRole('textbox').fill('x^2')
  await editor(page).getByRole('button', { name: 'Done' }).click()
  await page.locator('[data-math-block]').click()
  await editor(page).getByRole('textbox').fill('y^3')
  await page.keyboard.press('Escape')
  await expect(editor(page)).toHaveCount(0)
  await page.locator('[data-math-block]').click()
  await expect(editor(page).getByRole('textbox')).toHaveValue('x^2')
  await editor(page).getByRole('textbox').fill('\\frac{a')
  await expect(editor(page).locator('.katex-error')).toBeVisible()
})

test('the editor fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await insertFormula(page)
  await page.locator('[data-math-block]').click()
  await expect(editor(page)).toBeVisible()
  const box = (await editor(page).boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
