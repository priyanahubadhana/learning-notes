// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/** Wave 4 part B (G2): Table, Toggle list, File/PDF and Camera. */

test.use({ viewport: { width: 1200, height: 800 } })

async function newPage(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
}

async function slash(page: Page, query: string) {
  await page.keyboard.type(`/${query}`)
  await page.keyboard.press('Enter')
}

test('a table can be typed in and is still there after a reload', async ({
  page,
}) => {
  await newPage(page)
  await slash(page, 'table')
  const table = page.locator('.bn-editor table')
  await expect(table).toBeVisible()
  await page.keyboard.type('Term')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Meaning')
  await page.waitForTimeout(900) // autosave
  await page.reload()
  await expect(page.locator('.bn-editor table')).toContainText('Term')
  await expect(page.locator('.bn-editor table')).toContainText('Meaning')
})

test('a toggle list folds its children', async ({ page }) => {
  await newPage(page)
  await slash(page, 'toggle')
  await page.keyboard.type('Why?')
  await expect(
    page.locator('[data-content-type="toggleListItem"]'),
  ).toHaveCount(1)
})

test('a file is attached, saved out, and a PDF opens in the reader', async ({
  page,
}) => {
  await newPage(page)
  await slash(page, 'pdf')
  const card = page.locator('[data-file]')
  await expect(card).toBeVisible()
  const pdf = makePdf(['Alpha page words here', 'Bravo words', 'Charlie'], {
    title: 'Attached Book',
  })
  await page
    .getByTestId('file-input')
    .setInputFiles({
      name: 'attached.pdf',
      mimeType: 'application/pdf',
      buffer: pdf,
    })
  await expect(card.locator('[data-file-name]')).toHaveText('attached.pdf')

  // Save a copy downloads the bytes.
  const download = page.waitForEvent('download')
  await card.getByRole('button', { name: 'Save a copy' }).click()
  expect((await download).suggestedFilename()).toBe('attached.pdf')

  // It is still attached after a reload (the bytes are in the app).
  await page.waitForTimeout(900)
  await page.reload()
  await expect(page.locator('[data-file-name]')).toHaveText('attached.pdf')

  // Open in reader imports it once and shows the reader.
  await page.getByRole('button', { name: 'Open in reader' }).click()
  await expect(page.getByTestId('pdf-scroller')).toBeVisible({
    timeout: 15_000,
  })
})

test('a file that is not a book has no reader button', async ({ page }) => {
  await newPage(page)
  await slash(page, 'attach')
  await page.getByTestId('file-input').setInputFiles({
    name: 'data.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from([0x50, 0x4b, 3, 4, 1, 2, 3]),
  })
  await expect(page.locator('[data-file-name]')).toHaveText('data.zip')
  await expect(
    page.getByRole('button', { name: 'Open in reader' }),
  ).toHaveCount(0)
})

test('the camera adds a picture (a picker stands in on a computer)', async ({
  page,
}) => {
  await newPage(page)
  const chooser = page.waitForEvent('filechooser')
  await slash(page, 'camera')
  const file = await chooser
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP8z8Dwn4GBgYEBAA0OAgFx+3JoAAAAAElFTkSuQmCC',
    'base64',
  )
  await file.setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png })
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
})
