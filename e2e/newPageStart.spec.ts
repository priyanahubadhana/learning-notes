// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { addPage, createNotebook, typeInEditor } from './helpers.ts'

/** Phase N2: the template list under the cursor of a new, empty page. */

const start = (page: import('@playwright/test').Page) =>
  page.locator('[data-new-page-start]')

test('a new page offers Study (Recommended) first; choosing it fills the page', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await addPage(page, 'Biology', 'Cells')
  await expect(start(page)).toBeVisible()
  const names = await start(page).locator('li button').allTextContents()
  expect(names[0]).toContain('Study (Recommended)')
  expect(names.length).toBeGreaterThan(3)

  await start(page)
    .getByRole('button', { name: /^Study \(Recommended\)/ })
    .click()
  await expect(
    page.locator('.bn-editor').getByText('Key ideas', { exact: true }),
  ).toBeVisible()
  await expect(start(page)).toHaveCount(0)
})

test('the list goes away once you type, and the first page of a notebook has none', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await expect(start(page)).toHaveCount(0)
  await addPage(page, 'Biology', 'Cells')
  await expect(start(page)).toBeVisible()
  await typeInEditor(page, 'hello')
  await expect(start(page)).toHaveCount(0)
})

test('Always start new pages as Study fills every new page', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await addPage(page, 'Biology', 'Cells')
  const always = start(page).getByRole('checkbox', {
    name: 'Always start new pages as Study',
  })
  await always.click()
  await expect(always).toBeChecked()
  await addPage(page, 'Biology', 'Tissues')
  await expect(
    page.locator('.bn-editor').getByText('Key ideas', { exact: true }),
  ).toBeVisible()
  await expect(start(page)).toHaveCount(0)
})

test('the list fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await addPage(page, 'Biology', 'Cells')
  await expect(start(page)).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
