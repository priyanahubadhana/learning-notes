// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { addPage, createNotebook, typeInEditor } from './helpers.ts'

/** Polish 2 item 9: paper style and size, and sheet thumbnails. */

const more = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'More options' })

test('the page menu sets the paper style and size', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Styles')
  const sheet = page.locator('[data-paper-sheet="1"]')
  await expect(sheet).not.toHaveAttribute('data-paper-bg', /.+/)

  await more(page).click()
  await page.getByRole('menuitem', { name: /Paper style/ }).click()
  await page.getByRole('menuitemradio', { name: /Grid/ }).click()
  await expect(sheet).toHaveAttribute('data-paper-bg', 'grid')

  await more(page).click()
  await page.getByRole('menuitem', { name: /Paper size/ }).click()
  await page.getByRole('menuitemradio', { name: /Letter/ }).click()
  await expect(page.locator('[data-paper]')).toHaveAttribute(
    'data-sheet',
    'Letter',
  )
  const s = (await sheet.boundingBox())!
  expect(s.height / s.width).toBeCloseTo(279.4 / 215.9, 2)

  // It stays after a reload.
  await page.reload()
  await expect(page.locator('[data-paper-sheet="1"]')).toHaveAttribute(
    'data-paper-bg',
    'grid',
  )
  await expect(page.locator('[data-paper]')).toHaveAttribute(
    'data-sheet',
    'Letter',
  )
})

test('a new page offers the paper style before anything is written', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Paper', 'First')
  await addPage(page, 'Paper', 'Second')
  const row = page.locator('[data-new-page-paper]')
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Dots' }).click()
  await expect(page.locator('[data-paper-sheet="1"]')).toHaveAttribute(
    'data-paper-bg',
    'dots',
  )
  await expect(row.getByRole('button', { name: 'Dots' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('the left panel shows a thumbnail per sheet; a tap jumps there', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Long')
  await typeInEditor(page, 'Top')
  await page.keyboard.press('End')
  for (let i = 0; i < 90; i++) await page.keyboard.press('Enter')
  await expect(page.locator('[data-paper-sheet="2"]')).toBeAttached()

  await page.getByTestId('panel-toggle').click()
  const strip = page.getByTestId('left-panel').locator('[data-sheet-strip]')
  await expect(strip.locator('[data-sheet-thumb]').nth(1)).toBeVisible()
  await strip.getByRole('button', { name: 'Sheet 2' }).click()
  await expect
    .poll(async () =>
      page
        .locator('[data-paper-sheet="2"]')
        .evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBeLessThan(300)
})
